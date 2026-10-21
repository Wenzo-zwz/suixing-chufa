import { renderApp } from './render.mjs';
import { presetFilters, parseCustomNames, toggleTheme, rememberDestination } from './client-model.mjs';
import { mountGameInteractions } from './game-interactions.mjs';
import runtimeConfig from './runtime-config.mjs';

const storageKey = 'roam-preview-v1';
const readStored = () => {
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
  catch { return {}; }
};
const stored = readStored();
const clientToken = /^[0-9a-f]{64}$/.test(stored.clientToken || '')
  ? stored.clientToken
  : `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '');
const state = {
  screen: 'home', catalog: null, presetId: 'explore',
  filters: presetFilters('explore', { originId: stored.originId || '', themeIds: [] }),
  gameId: 'plane', destination: null, resultRound: null, poolCount: 0, candidateNames: [],
  room: null, clientId: stored.clientId || crypto.randomUUID(),
  nickname: stored.nickname || '旅行者', mode: 'solo',
  busy: false, revealing: false, ritual: '', endingStartedAt: 0,
  saved: Array.isArray(stored.saved) ? stored.saved : [],
  journeys: Array.isArray(stored.journeys) ? stored.journeys : [],
  history: Array.isArray(stored.history) ? stored.history : [],
  modal: null, modalDraft: {}, toast: '', error: '', detailExpanded: false,
  reduceMotion: Boolean(stored.reduceMotion) || matchMedia('(prefers-reduced-motion: reduce)').matches,
  note: '', rejected: []
};
const explicitlySet = new Set();
const root = document.querySelector('#app');
let revealTimer;
let toastTimer;
let roomTimer;
let poolRequest = 0;
let pendingStart = false;
let seenRoomDraw = '';
let roomCode = stored.roomCode || '';
let polling = null;
let roomSession = 0;
let roomRequest = 0;
let appliedRoomRequest = 0;
const draftExplicitlySet = new Set();
let disposeGame = () => {};
let localRoomRitual = null;
let endingPose = null;

function persist() {
  localStorage.setItem(storageKey, JSON.stringify({
    clientId: state.clientId, clientToken, nickname: state.nickname,
    originId: state.filters.originId, saved: state.saved,
    journeys: state.journeys, history: state.history.slice(0, 100),
    reduceMotion: state.reduceMotion, roomCode
  }));
}

function render() {
  disposeGame();
  disposeGame = () => {};
  root.innerHTML = renderApp({ ...state, gestureElapsed: state.endingStartedAt ? performance.now() - state.endingStartedAt : 0 });
  document.body.dataset.screen = state.screen;
  document.title = `${state.screen === 'result' && state.destination ? `${state.destination.name} · ` : ''}随性出发`;
  const stage = root.querySelector('#game-stage');
  if (stage && state.revealing && endingPose) {
    for (const [property, value] of endingPose) stage.style.setProperty(property, value);
  }
  if (stage && !state.busy && !state.revealing && !state.modal && state.poolCount) {
    disposeGame = mountGameInteractions(stage, {
      gameId: state.gameId, reduceMotion: state.reduceMotion,
      onCommit: action => launch(action.summary)
    });
  }
}

function toast(message) {
  state.toast = message;
  clearTimeout(toastTimer);
  render();
  toastTimer = setTimeout(() => { state.toast = ''; if (!state.modal) render(); }, 2600);
}

async function api(url, body) {
  const response = await fetch(`${runtimeConfig.apiBase}${url}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'x-travel-client': state.clientId, 'x-travel-token': clientToken },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || '暂时没能完成，请再试一次');
    error.code = data.code;
    error.status = response.status;
    throw error;
  }
  return data;
}

async function refreshPool() {
  const request = ++poolRequest;
  const pool = await api('/api/candidates', { filters: state.filters });
  if (request === poolRequest) {
    state.poolCount = pool.candidates.length;
    state.candidateNames = pool.candidates.map(item => item.name);
    state.note = pool.note || '';
    state.rejected = pool.rejected || [];
  }
  return pool;
}

function openModal(name) {
  draftExplicitlySet.clear();
  state.modal = name;
  state.modalDraft = {
    ...state.filters,
    provinces: [...state.filters.provinces],
    themeIds: [...state.filters.themeIds],
    nickname: state.nickname,
    customText: state.filters.customNames.join('\n'),
    inviteCode: new URLSearchParams(location.search).get('room') || '',
    gameId: state.gameId, reduceMotion: state.reduceMotion
  };
  state.error = '';
  render();
  const field = root.querySelector('.bottom-sheet input, .bottom-sheet textarea, .bottom-sheet select');
  field?.focus({ preventScroll: true });
}

function closeModal() {
  state.modal = null;
  state.error = '';
  render();
}

function recordResult(destination, drawId, createdAt, round = null) {
  state.destination = destination;
  state.resultRound = round;
  state.detailExpanded = false;
  if (!state.history.some(item => item.drawId === drawId)) {
    state.history.unshift({ destination, drawId, round, ritual: state.ritual, createdAt: createdAt || new Date().toISOString() });
  }
  persist();
}

function finishReveal() {
  clearTimeout(revealTimer);
  state.revealing = false;
  state.screen = 'result';
  state.busy = false;
  render();
}

function showReveal() {
  clearTimeout(revealTimer);
  state.screen = 'game';
  state.revealing = true;
  state.busy = false;
  render();
  if (state.reduceMotion) finishReveal();
  else revealTimer = setTimeout(finishReveal, 2500);
}

async function launch(ritual = '') {
  if (state.busy || state.revealing || state.screen !== 'game') return;
  if (state.room && state.mode === 'group' && !roomCanDraw(state.room)) {
    state.screen = 'room'; state.error = '共同条件有变化，等大家重新准备好再出发。'; render(); return;
  }
  state.ritual = ritual;
  state.endingStartedAt = ritual ? performance.now() : 0;
  const stage = root.querySelector('#game-stage');
  endingPose = ritual && stage ? ['--drag-x', '--drag-y', '--tilt'].map(property => [property, stage.style.getPropertyValue(property)]) : null;
  if (state.room && state.mode === 'group') {
    localRoomRitual = { code: roomCode, round: state.room.round, summary: ritual };
    return drawRoom({ keepStage: Boolean(ritual) });
  }
  state.busy = true;
  state.error = '';
  if (!ritual) render();
  else root.querySelector('#game-stage')?.setAttribute('aria-busy', 'true');
  try {
    const result = await api('/api/draw', { filters: state.filters });
    state.poolCount = result.poolSize;
    state.candidateNames = result.candidateNames;
    recordResult(result.destination, result.drawId, result.createdAt);
    showReveal();
  } catch (error) {
    state.busy = false;
    state.error = error.message;
    render();
  }
}

async function startSelection() {
  if (state.busy) return;
  state.busy = true;
  if (state.mode === 'group') invalidateRoomSession();
  state.error = '';
  state.ritual = '';
  state.endingStartedAt = 0;
  render();
  try {
    const pool = await refreshPool();
    if (pool.needsOrigin) {
      pendingStart = true;
      state.busy = false;
      openModal('origin');
      return;
    }
    if (!pool.candidates.length) {
      state.error = '这些条件下暂时没有合适的示例目的地，微调一下再试试';
      state.screen = 'game';
      return;
    }
    if (state.mode === 'group') await createRoom();
    else { state.screen = 'game'; state.revealing = false; }
  } finally {
    state.busy = false;
    render();
  }
}

function usePreset(id) {
  state.presetId = id;
  state.filters = presetFilters(id, state.filters, [...explicitlySet]);
  state.gameId = 'plane';
  return startSelection();
}

function startPolling() {
  clearInterval(roomTimer);
  roomTimer = setInterval(() => { if (roomCode && state.mode === 'group' && !state.busy && !state.modal) pollRoom(); }, 1500);
}

function invalidateRoomSession() {
  roomSession += 1;
  polling = null;
  clearInterval(roomTimer);
}

// Every room response belongs to the session and request that issued it.
async function requestRoom(url, body) {
  const session = roomSession;
  const request = ++roomRequest;
  try {
    const room = await api(url, body);
    if (session !== roomSession || request < appliedRoomRequest) return null;
    if (state.room && room.inviteCode === state.room.inviteCode &&
      (room.version < state.room.version || room.round < state.room.round)) return null;
    appliedRoomRequest = request;
    return room;
  } catch (error) {
    if (session !== roomSession || request < appliedRoomRequest) return null;
    if (error.code === 'VERSION_CONFLICT' && roomCode) {
      const latest = await requestRoom(`/api/rooms/${encodeURIComponent(roomCode)}`);
      if (session !== roomSession) return null;
      if (latest) receiveRoom(latest);
      error.message = '条件已经更新，已刷新最新房间。你的修改已保留，请查看共同候选后再次确认';
    }
    throw error;
  }
}

async function roomCommand(run) {
  if (state.busy) return;
  state.busy = true;
  state.error = '';
  render();
  try { return await run(); }
  finally {
    state.busy = false;
    if (roomCode && state.mode === 'group') startPolling();
    render();
  }
}

function roomCanDraw(room) {
  return room?.phase === 'ready' && room.members.length >= 2 && room.members.every(member => member.ready) && room.candidates?.length > 0;
}

function receiveRoom(room, { restore = false } = {}) {
  if (!room) return;
  const previous = state.room;
  if (previous && previous.inviteCode === room.inviteCode && room.round > previous.round) {
    clearTimeout(revealTimer);
    state.destination = null;
    state.resultRound = null;
    state.revealing = false;
    seenRoomDraw = '';
    if (['game', 'result'].includes(state.screen)) state.screen = 'room';
  }
  const changed = JSON.stringify(state.room) !== JSON.stringify(room);
  state.room = room;
  state.mode = 'group';
  roomCode = room.inviteCode;
  const me = room.members.find(member => member.id === state.clientId);
  if (me) {
    state.filters = { ...state.filters, ...me.filters };
    state.presetId = state.filters.preset;
  }
  state.poolCount = room.candidates?.length || 0;
  state.candidateNames = (room.candidates || []).map(item => item.name);
  state.rejected = room.rejected || [];
  if (state.screen === 'game' && room.phase !== 'drawn' && !roomCanDraw(room)) {
    state.screen = 'room'; state.ritual = ''; state.endingStartedAt = 0;
  }
  persist();
  if (room.phase === 'drawn' && room.destination) {
    const drawId = `room-${room.inviteCode}-${room.round}`;
    if (seenRoomDraw !== drawId) {
      seenRoomDraw = drawId;
      const myGesture = localRoomRitual?.code === room.inviteCode && localRoomRitual.round === room.round;
      state.ritual = myGesture ? localRoomRitual.summary : state.history.find(item => item.drawId === drawId)?.ritual || '';
      if (!myGesture) { state.endingStartedAt = 0; endingPose = null; }
      localRoomRitual = null;
      recordResult(room.destination, drawId, room.history?.at(-1)?.createdAt, room.round);
      if (restore) { state.screen = 'result'; state.revealing = false; render(); }
      else showReveal();
      return;
    }
  }
  if (changed && !state.modal && !state.revealing) render();
}

async function pollRoom() {
  if (polling || !roomCode || state.mode !== 'group') return;
  const token = { session: roomSession, code: roomCode };
  polling = token;
  try { receiveRoom(await requestRoom(`/api/rooms/${encodeURIComponent(token.code)}`)); }
  catch (error) {
    if (token.session !== roomSession || token.code !== roomCode) return;
    if ([403, 404].includes(error.status)) {
      invalidateRoomSession();
      roomCode = '';
      state.room = null;
      state.mode = 'solo';
      persist();
      state.error = '这个预览房间已结束，可以重新发起一次';
      if (state.screen === 'room') { state.screen = 'home'; render(); }
    }
  } finally { if (polling === token) polling = null; }
}

async function createRoom() {
  invalidateRoomSession();
  const room = await requestRoom('/api/rooms', { nickname: state.nickname, filters: state.filters });
  if (!room) return;
  state.screen = 'room';
  seenRoomDraw = '';
  receiveRoom(room);
  startPolling();
  render();
}

async function joinRoom() {
  const code = String(state.modalDraft.inviteCode || '').trim().toUpperCase();
  if (!code) throw new Error('填入朋友分享的邀请码');
  const nickname = String(state.modalDraft.nickname || state.nickname).trim();
  invalidateRoomSession();
  const room = await requestRoom(`/api/rooms/${encodeURIComponent(code)}/join`, { nickname });
  if (!room) return;
  state.nickname = nickname;
  state.modal = null;
  state.screen = 'room';
  seenRoomDraw = '';
  receiveRoom(room);
  startPolling();
  render();
}

async function readyRoom() {
  if (!state.room) return;
  receiveRoom(await requestRoom(`/api/rooms/${roomCode}/ready`, { version: state.room.version }));
}

async function drawRoom({ keepStage = false } = {}) {
  if (!state.room || state.busy) return;
  state.busy = true;
  state.error = '';
  if (!keepStage) render();
  else root.querySelector('#game-stage')?.setAttribute('aria-busy', 'true');
  try {
    const room = await requestRoom(`/api/rooms/${roomCode}/draw`, { version: state.room.version });
    state.busy = false;
    receiveRoom(room);
  } catch (error) {
    state.busy = false;
    state.error = error.message;
    render();
  }
}

async function nextRound() {
  if (!state.room) return;
  const room = await requestRoom(`/api/rooms/${roomCode}/next`, { version: state.room.version });
  if (!room) return;
  state.screen = 'room';
  state.ritual = '';
  state.endingStartedAt = 0;
  localRoomRitual = null;
  seenRoomDraw = '';
  receiveRoom(room);
  render();
}

async function applyFilters() {
  const draft = state.modalDraft;
  const numberOrNull = value => value === '' || value == null ? null : Number(value);
  const filters = { ...state.filters, preset: draft.preset || state.filters.preset };
  const changedKeys = [];
  for (const key of ['originId', 'kind', 'maxDistanceKm', 'maxBudget', 'provinces']) {
    const value = ['maxDistanceKm', 'maxBudget'].includes(key) ? numberOrNull(draft[key]) : draft[key];
    if (JSON.stringify(value) !== JSON.stringify(state.filters[key])) changedKeys.push(key);
    if (value !== undefined) filters[key] = value;
  }
  filters.themeIds = [...(draft.themeIds || state.filters.themeIds)];
  if (state.room && state.mode === 'group') {
    const room = await requestRoom(`/api/rooms/${roomCode}/member`, {
      nickname: state.nickname, filters, version: state.room.version
    });
    if (!room) return;
    state.modal = null;
    receiveRoom(room);
    state.screen = 'room';
  } else {
    state.filters = filters;
    state.presetId = filters.preset;
    state.modal = null;
  }
  changedKeys.forEach(key => explicitlySet.add(key));
  state.gameId = draft.gameId || state.gameId;
  state.reduceMotion = Boolean(draft.reduceMotion);
  persist();
  if (!state.room || state.mode !== 'group') {
    if (pendingStart) { pendingStart = false; await startSelection(); }
    else await refreshPool();
  }
  render();
}

async function applyCustom() {
  const names = parseCustomNames(state.modalDraft.customText);
  if (!names.length) throw new Error('写下至少一个你想去的地方');
  if (names.length > 100) throw new Error('每次最多 100 个地方，可以分几次抽');
  const filters = {
    ...presetFilters('explore', { originId: state.filters.originId }),
    customNames: names
  };
  if (state.room && state.mode === 'group') {
    const room = await requestRoom(`/api/rooms/${roomCode}/member`, {
      nickname: state.nickname, filters, version: state.room.version
    });
    if (!room) return;
    state.modal = null;
    explicitlySet.clear();
    state.screen = 'room';
    receiveRoom(room);
    render();
    return;
  }
  state.filters = filters;
  state.presetId = 'explore';
  state.modal = null;
  explicitlySet.clear();
  await startSelection();
}

async function applyTheme() {
  const filters = { ...state.filters, themeIds: [...(state.modalDraft.themeIds || [])] };
  if (state.room && state.mode === 'group') {
    const room = await requestRoom(`/api/rooms/${roomCode}/member`, {
      nickname: state.nickname, filters, version: state.room.version
    });
    if (!room) return;
    state.modal = null;
    receiveRoom(room);
  } else {
    state.filters = filters;
    state.modal = null;
    await refreshPool();
    render();
  }
}

async function applyNickname() {
  const name = String(state.modalDraft.nickname || '').trim();
  if (!name || name.length > 24) throw new Error('昵称写 1 到 24 个字就好');
  if (state.room && state.mode === 'group') {
    const room = await requestRoom(`/api/rooms/${roomCode}/member`, { nickname: name, version: state.room.version });
    if (!room) return;
    state.nickname = name;
    state.modal = null;
    receiveRoom(room);
  } else { state.nickname = name; state.modal = null; }
  persist();
  render();
}

async function applyOrigin() {
  const originId = state.modalDraft.originId;
  if (!originId) throw new Error('选一个出发城市，就可以开始了');
  state.filters.originId = originId;
  explicitlySet.add('originId');
  state.modal = null;
  pendingStart = false;
  persist();
  await startSelection();
}

async function share() {
  const shareUrl = new URL(location.href);
  shareUrl.search = '';
  shareUrl.hash = '';
  if (state.room && state.mode === 'group') shareUrl.searchParams.set('room', roomCode);
  const text = state.room && state.mode === 'group'
    ? `一起让运气决定去哪吧！\n随性出发 · 邀请码 ${roomCode}\n${shareUrl.href}`
    : state.destination
      ? `命运替我选了：${state.destination.name}\n${state.destination.tagline || '这次，就出发吧。'}\n随性出发`
      : `一起随性出发：${shareUrl.href}`;
  try {
    await navigator.clipboard.writeText(text);
    toast(state.room && state.mode === 'group' ? '邀请链接已复制，发给朋友就能加入' : '出发邀请已复制');
  } catch { toast(text); }
}

async function handleAction(action, element) {
  state.error = '';
  switch (action) {
    case 'select-preset': return usePreset(element.dataset.id);
    case 'quick-random':
      state.presetId = 'explore';
      state.filters = presetFilters('explore', { originId: state.filters.originId, themeIds: [] });
      explicitlySet.clear();
      return startSelection();
    case 'open-modal': return openModal(element.dataset.modal);
    case 'close-modal': pendingStart = false; return closeModal();
    case 'set-theme':
      if (state.modal) {
        state.modalDraft.themeIds = toggleTheme(state.modalDraft.themeIds || [], element.dataset.id);
        render();
      } else {
        const filters = { ...state.filters, themeIds: toggleTheme(state.filters.themeIds, element.dataset.id) };
        if (state.room && state.mode === 'group') {
          receiveRoom(await requestRoom(`/api/rooms/${roomCode}/member`, { nickname: state.nickname, filters, version: state.room.version }));
        } else {
          state.filters = filters;
          await refreshPool(); render();
        }
      }
      return;
    case 'set-game': state.gameId = element.dataset.id; state.ritual = ''; state.endingStartedAt = 0; persist(); render(); return;
    case 'launch': return launch();
    case 'skip-animation': return finishReveal();
    case 'go':
      clearTimeout(revealTimer);
      state.revealing = false;
      state.modal = null;
      state.screen = element.dataset.screen;
      render(); return;
    case 'draw-again':
      if (state.room && state.mode === 'group') return nextRound();
      state.screen = 'game'; state.revealing = false; state.endingStartedAt = 0; await refreshPool(); render(); return;
    case 'save-destination':
      if (!state.destination) return;
      if (state.saved.some(item => item.id === state.destination.id)) {
        state.saved = state.saved.filter(item => item.id !== state.destination.id);
        persist(); toast('已从收藏移出');
      } else {
        state.saved = rememberDestination(state.saved, state.destination);
        persist(); toast('放进收藏，想去的时候再翻出来');
      }
      return;
    case 'accept-destination':
      if (!state.destination) return;
      if (!state.journeys.some(item => item.destination.id === state.destination.id && item.status === 'planned')) {
        state.journeys.unshift({ id: crypto.randomUUID(), destination: state.destination, status: 'planned', createdAt: new Date().toISOString() });
      }
      persist(); toast('出发邮戳已盖好，旅程已保存'); return;
    case 'expand-details': state.detailExpanded = !state.detailExpanded; render(); return;
    case 'complete-journey':
      state.journeys = state.journeys.map(item => item.id === element.dataset.id ? { ...item, status: 'completed' } : item);
      persist(); toast('收下一枚旅行印章，记住这次出走'); return;
    case 'copy-share': return share();
    case 'create-room': return startSelection();
    case 'join-room': return joinRoom();
    case 'ready-room': return readyRoom();
    case 'draw-room':
      if (!roomCanDraw(state.room)) return;
      state.screen = 'game'; state.revealing = false; state.ritual = ''; state.endingStartedAt = 0; render(); return;
    case 'next-round': return nextRound();
    case 'leave-room':
      invalidateRoomSession();
      if (roomCode) await requestRoom(`/api/rooms/${roomCode}/leave`, {});
      roomCode = ''; state.room = null;
      state.destination = null; state.resultRound = null;
      clearTimeout(revealTimer); state.revealing = false;
      state.mode = 'solo'; state.screen = 'home'; persist(); render(); return;
    case 'apply-filters': return applyFilters();
    case 'apply-theme': return applyTheme();
    case 'apply-nickname': return applyNickname();
    case 'apply-origin': return applyOrigin();
    case 'apply-custom': return applyCustom();
    case 'set-mode':
      invalidateRoomSession();
      state.mode = element.dataset.id;
      if (state.mode === 'group' && state.room) { state.screen = 'room'; startPolling(); await pollRoom(); }
      render(); return;
    case 'show-easter': {
      const messages = {
        food: `这次尝尝${state.destination?.foods?.[0] || '没吃过的味道'}吧。`,
        plane: '纸飞机悄悄说：出发不一定要有一个很大的理由。',
        stamp: '这枚邮戳属于愿意出发的你。',
        ticket: '车票折成纸飞机，下次再去一个新地方。'
      };
      toast(messages[element.dataset.kind] || '你发现了一枚藏起来的小惊喜。');
      return;
    }
  }
}

root.addEventListener('click', async event => {
  const element = event.target.closest('[data-action]');
  if (!element || element.disabled) return;
  if (state.busy && !['skip-animation','close-modal'].includes(element.dataset.action)) return;
  const action = element.dataset.action;
  const writes = ['join-room', 'ready-room', 'next-round', 'leave-room', 'draw-again'];
  const edits = ['apply-filters', 'apply-theme', 'apply-custom', 'apply-nickname'];
  const lock = action === 'join-room' || (state.room && state.mode === 'group' && (writes.includes(action) || edits.includes(action) || (action === 'set-theme' && !state.modal)));
  try {
    if (lock) await roomCommand(() => handleAction(action, element));
    else await handleAction(action, element);
  }
  catch (error) { state.busy = false; state.error = error.message; render(); }
});

root.addEventListener('input', event => {
  const field = event.target.dataset.field;
  if (!field) return;
  state.modalDraft[field] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
  if (state.modal) draftExplicitlySet.add(field);
});

root.addEventListener('change', event => {
  if (event.target.name === 'province') {
    state.modalDraft.provinces = [...root.querySelectorAll('input[name="province"]:checked')].map(input => input.value);
    draftExplicitlySet.add('provinces');
  }
  const field = event.target.dataset.field;
  if (field === 'preset' && state.modal) {
    state.modalDraft = {
      ...state.modalDraft,
      ...presetFilters(event.target.value, state.modalDraft, [...new Set([...explicitlySet, ...draftExplicitlySet])])
    };
    render();
  } else if (field === 'reduceMotion' && !state.modal) {
    state.reduceMotion = event.target.checked;
    persist();
  } else if (field) {
    state.modalDraft[field] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    if (state.modal) draftExplicitlySet.add(field);
  }
});

window.addEventListener('pagehide', () => {
  disposeGame();
  clearInterval(roomTimer); clearTimeout(revealTimer); clearTimeout(toastTimer);
});
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  state.toast = '';
  if (state.revealing) finishReveal();
  else render();
  if (roomCode && state.mode === 'group') { startPolling(); pollRoom(); }
});

async function boot() {
  try {
    persist();
    state.catalog = await api('/api/catalog');
    persist();
    await refreshPool();
    const invitation = new URLSearchParams(location.search).get('room');
    if (roomCode && (!invitation || invitation.toUpperCase() === roomCode)) {
      try {
        state.screen = 'room';
        receiveRoom(await requestRoom(`/api/rooms/${encodeURIComponent(roomCode)}`), { restore: true });
        startPolling();
      } catch {
        roomCode = ''; state.room = null; state.mode = 'solo'; state.screen = 'home'; persist();
        if (invitation) openModal('join');
      }
    } else if (invitation) {
      state.mode = 'group';
      openModal('join');
    }
    render();
  } catch (error) {
    root.innerHTML = '<main style="padding:40px;font-family:sans-serif"><h1>随性出发</h1><p>出发服务暂时没连上，请刷新再试。</p></main>';
    document.body.dataset.screen = 'error';
    console.error(error);
  }
}

boot();
