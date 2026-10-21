import { createHash, randomInt, randomUUID } from 'node:crypto';
import { DESTINATIONS, ORIGINS, PRESETS } from './catalog.mjs';

export class DomainError extends Error {
  constructor(message, code = 'INVALID_DATA', status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function fail(message, code = 'INVALID_DATA', status = 400) {
  throw new DomainError(message, code, status);
}

function stringList(value, field, maximum = 100) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maximum || value.some(item => typeof item !== 'string' || item.length > 100)) {
    fail(`${field}需要有效的文字列表，最多 ${maximum} 项；请删除或合并后重试`);
  }
  return [...new Set(value.map(item => item.trim().normalize('NFKC')).filter(Boolean))];
}

export function normalizeFilters(input = {}, customNameMaximum = 100) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('筛选条件需要是对象');
  const preset = input.preset ?? 'explore';
  const presetItem = PRESETS.find(item => item.id === preset);
  if (!presetItem) fail('请选择有效的出发意图');
  const kind = input.kind ?? presetItem.kind;
  if (!['city', 'spot'].includes(kind)) fail('目的地类型无效');
  const originId = input.originId ?? '';
  if (typeof originId !== 'string' || (originId && !ORIGINS.some(item => item.id === originId))) fail('请选择目录中的出发城市');
  for (const field of ['maxDistanceKm', 'maxBudget']) {
    const value = input[field];
    if (value !== undefined && value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (field === 'maxDistanceKm' && value === 0))) {
      fail(`${field === 'maxDistanceKm' ? '距离' : '当地消费上限'}需要有效的非负数值`);
    }
  }
  return {
    preset, originId,
    provinces: stringList(input.provinces, '地区'),
    themeIds: stringList(input.themeIds, '主题'),
    kind,
    maxDistanceKm: input.maxDistanceKm === undefined ? (preset === 'near' ? 120 : null) : input.maxDistanceKm,
    maxBudget: input.maxBudget ?? null,
    customNames: stringList(input.customNames, '自填目的地', customNameMaximum),
    excludedIds: stringList(input.excludedIds, '排除名单', 200)
  };
}

const canonicalName = value => value.trim().normalize('NFKC');
const destinationKey = item => `${item.kind}|${canonicalName(item.name)}|${item.province || ''}|${item.city || ''}`;

function customDestination(name) {
  return {
    id: `custom-${createHash('sha256').update(name).digest('hex').slice(0, 16)}`,
    name, province: '', city: '', kind: 'city', coordinates: null, themes: [], tier: 'flexible',
    tagline: '你的自填目的地',
    description: '这是你自填的目的地，尚未核实地点、出行条件和当地资料。出发前请自行查询。',
    highlights: [], foods: [], seasons: [],
    climate: '暂无核实资料，天气请查询实时服务。',
    travel: '暂无核实资料，交通、耗时和班次需自行查询。',
    days: '停留时间由你决定', localBudget: null, art: 'city', sourceUrl: '', sourceLabel: '',
    dataNote: '自定义名单 · 未核实目的地资料；不提供虚构天气、价格或交通信息。'
  };
}

function distanceKm(left, right) {
  const radians = degrees => degrees * Math.PI / 180;
  const latitude = radians(right.lat - left.lat);
  const longitude = radians(right.lng - left.lng);
  const value = Math.sin(latitude / 2) ** 2 + Math.cos(radians(left.lat)) * Math.cos(radians(right.lat)) * Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function candidatePool(input = {}, catalog = DESTINATIONS) {
  return filteredPool(normalizeFilters(input), catalog);
}

function filteredPool(filters, catalog) {
  const nearby = filters.maxDistanceKm !== null;
  const radius = filters.maxDistanceKm;
  const origin = ORIGINS.find(item => item.id === filters.originId);
  if (nearby && !origin) return { candidates: [], rejected: [], needsOrigin: true, note: '请先选择出发城市，附近按地理直线距离筛选，不代表实时交通耗时。' };
  const source = filters.customNames.length
    ? filters.customNames.map(name => catalog.find(item => canonicalName(item.name) === name) ?? customDestination(name))
    : catalog;
  const seenIds = new Set();
  const seenPlaces = new Set();
  const candidates = [];
  const rejected = [];
  for (const item of source) {
    const key = destinationKey(item);
    if (seenIds.has(item.id) || seenPlaces.has(key)) continue;
    seenIds.add(item.id);
    seenPlaces.add(key);
    let reason = '';
    if (filters.excludedIds.includes(item.id)) reason = '已排除';
    else if (!filters.customNames.length && item.kind !== filters.kind) reason = '目的地类型不符';
    else if (filters.provinces.length && !filters.provinces.includes(item.province)) reason = '不在所选地区';
    else if (filters.themeIds.length && !filters.themeIds.some(theme => item.themes.includes(theme))) reason = '暂无符合所选主题的资料';
    else if (!filters.customNames.length && filters.preset === 'enjoy' && item.tier !== 'premium') reason = '不属于此体验意图的演示候选';
    else if (filters.maxBudget !== null && (!item.localBudget || item.localBudget.max > filters.maxBudget)) reason = '当地消费演示上限超出或未知';
    else if (nearby && (!item.coordinates || distanceKm(origin.coordinates, item.coordinates) > radius)) reason = '超出地理距离范围或坐标未知';
    if (reason) rejected.push({ name: item.name, reason });
    else candidates.push(item);
  }
  return {
    candidates, rejected, needsOrigin: false,
    note: nearby
      ? `演示目录 · 出发城市周边 ${radius} 公里地理直线距离筛选；不等于实时耗时，也不承诺当天往返。当地消费参考不含往返交通。`
      : '演示目录并非全国全量资料；当地消费为演示参考，不含往返交通，天气、班次与余票需实时查询。'
  };
}

export function drawCandidate(candidates, randomIndex = randomInt) {
  if (!Array.isArray(candidates) || candidates.length === 0) fail('没有可抽取的候选，请微调条件', 'NO_CANDIDATES', 409);
  const index = randomIndex(candidates.length);
  if (!Number.isInteger(index) || index < 0 || index >= candidates.length) throw new RangeError('随机索引超出候选范围');
  return candidates[index];
}

function identity(clientId) {
  if (typeof clientId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(clientId)) fail('缺少有效的本地成员身份', 'INVALID_IDENTITY');
  return clientId;
}

function nickname(value = '旅行者') {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 30) fail('昵称需要 1–30 个字符');
  return value.trim();
}

export class RoomStore {
  #rooms = new Map();
  #catalog;
  #randomIndex;

  constructor({ catalog = DESTINATIONS, randomIndex = randomInt } = {}) {
    this.#catalog = catalog;
    this.#randomIndex = randomIndex;
  }

  exportRecord(code) {
    return structuredClone(this.#record(code));
  }

  importRecord(record) {
    const copy = structuredClone({ room: record.room, drawVersion: record.drawVersion });
    this.#rooms.set(copy.room.inviteCode, copy);
  }

  #record(code) {
    if (typeof code !== 'string') fail('邀请码无效');
    const record = this.#rooms.get(code.trim().toUpperCase());
    if (!record) fail('没有找到这个房间，请检查邀请码', 'ROOM_NOT_FOUND', 404);
    return record;
  }

  #member(room, clientId) {
    identity(clientId);
    const member = room.members.find(item => item.id === clientId);
    if (!member) fail('你还不是此房间成员，请先加入', 'NOT_MEMBER', 403);
    return member;
  }

  #version(room, version) {
    if (!Number.isInteger(version) || version < 1) fail('请求需要有效的候选版本');
    if (version !== room.version) fail('条件已经更新，请查看最新房间并重新确认', 'VERSION_CONFLICT', 409);
  }

  #refresh(room, { reset = true } = {}) {
    const sharedNames = stringList(room.members.flatMap(member => member.filters.customNames), '房间共同候选', 200);
    const evaluations = room.members.map(member => filteredPool({ ...member.filters, customNames: sharedNames }, this.#catalog));
    const pools = evaluations.map(pool => pool.candidates);
    room.candidates = pools.length ? pools[0].filter(item => pools.slice(1).every(pool => pool.some(other => destinationKey(other) === destinationKey(item)))) : [];
    const rejected = new Map();
    evaluations.forEach((pool, index) => {
      const reasons = pool.needsOrigin
        ? (sharedNames.length ? sharedNames : this.#catalog.map(item => item.name)).map(name => ({ name, reason: '请先选择出发城市，才能确认地理距离范围' }))
        : pool.rejected;
      for (const item of reasons) {
        const reason = `${room.members[index].nickname}：${item.reason}`;
        const entry = rejected.get(item.name) || { name: item.name, reasons: [] };
        if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
        rejected.set(item.name, entry);
      }
    });
    room.rejected = [...rejected.values()].map(item => ({ name: item.name, reason: item.reasons.join('；') }));
    if (reset) {
      room.members.forEach(member => { member.ready = false; });
      room.phase = 'collecting';
    }
  }

  create({ clientId, nickname: name, filters = {} }) {
    identity(clientId);
    const normalized = normalizeFilters(filters, 20);
    let inviteCode;
    do { inviteCode = randomInt(100000, 1000000).toString(); } while (this.#rooms.has(inviteCode));
    const room = {
      id: randomUUID(), inviteCode, version: 1, round: 1, phase: 'collecting',
      members: [{ id: clientId, nickname: nickname(name), ready: false, filters: normalized }],
      candidates: [], destination: null, history: []
    };
    this.#refresh(room);
    this.#rooms.set(inviteCode, { room, drawVersion: null });
    return structuredClone(room);
  }

  join(code, { clientId, nickname: name, filters }) {
    identity(clientId);
    const record = this.#record(code);
    const { room } = record;
    if (room.members.some(item => item.id === clientId)) return structuredClone(room);
    if (room.members.length >= 10) fail('房间最多 10 位成员，请等待其他成员退出后再加入', 'ROOM_FULL', 409);
    const normalized = normalizeFilters(filters === undefined ? room.members[0]?.filters ?? {} : filters, 20);
    const displayName = nickname(name);
    room.members.push({ id: clientId, nickname: displayName, ready: false, filters: normalized });
    room.version += 1;
    if (room.phase !== 'drawn') this.#refresh(room);
    return structuredClone(room);
  }

  read(code, clientId) {
    const { room } = this.#record(code);
    this.#member(room, clientId);
    return structuredClone(room);
  }

  update(code, { clientId, nickname: name, filters, version }) {
    const { room } = this.#record(code);
    const member = this.#member(room, clientId);
    this.#version(room, version);
    const normalized = normalizeFilters(filters ?? member.filters, 20);
    const displayName = name === undefined ? member.nickname : nickname(name);
    const changed = JSON.stringify(normalized) !== JSON.stringify(member.filters);
    member.nickname = displayName;
    if (changed) {
      member.filters = normalized;
      room.version += 1;
      if (room.phase !== 'drawn') this.#refresh(room);
      else room.members.forEach(item => { item.ready = false; });
    } else if (room.phase !== 'drawn') this.#refresh(room, { reset: false });
    return structuredClone(room);
  }

  ready(code, { clientId, version }) {
    const { room } = this.#record(code);
    const member = this.#member(room, clientId);
    this.#version(room, version);
    if (room.phase === 'drawn') fail('本轮已经抽出结果，开启下一轮后再确认', 'ROUND_DRAWN', 409);
    if (!room.candidates.length) fail('没有共同候选，请补充出发城市或微调成员条件', 'NO_CANDIDATES', 409);
    member.ready = true;
    room.phase = room.members.length >= 2 && room.members.every(item => item.ready) ? 'ready' : 'collecting';
    return structuredClone(room);
  }

  draw(code, { clientId, version }) {
    const record = this.#record(code);
    const { room } = record;
    this.#member(room, clientId);
    if (room.phase === 'drawn' && Number.isInteger(version) && (version === room.version || version === record.drawVersion)) return structuredClone(room);
    this.#version(room, version);
    if (!room.candidates.length) fail('没有共同候选，请微调成员条件', 'NO_CANDIDATES', 409);
    if (room.members.length < 2 || !room.members.every(item => item.ready)) fail('至少两位成员且全员确认后才能共同抽取', 'NOT_READY', 409);
    // Version check, final uniform draw and storage are synchronous: one result per round.
    room.destination = drawCandidate(room.candidates, this.#randomIndex);
    room.phase = 'drawn';
    record.drawVersion = room.version;
    room.history.push({ round: room.round, destination: room.destination, poolSize: room.candidates.length, candidateNames: room.candidates.map(item => item.name), drawId: randomUUID(), createdAt: new Date().toISOString() });
    return structuredClone(room);
  }

  leave(code, clientId) {
    const { room } = this.#record(code);
    this.#member(room, clientId);
    room.members = room.members.filter(item => item.id !== clientId);
    room.version += 1;
    if (room.phase !== 'drawn') this.#refresh(room);
    return room.members.length ? structuredClone(room) : { left: true };
  }

  next(code, { clientId, version }) {
    const record = this.#record(code);
    const { room } = record;
    this.#member(room, clientId);
    this.#version(room, version);
    if (room.phase !== 'drawn') fail('本轮尚未生成结果', 'ROUND_NOT_DRAWN', 409);
    room.round += 1;
    room.version += 1;
    room.destination = null;
    record.drawVersion = null;
    this.#refresh(room);
    return structuredClone(room);
  }
}
