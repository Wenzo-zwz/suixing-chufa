import { createHash, randomInt, randomUUID } from 'node:crypto';
import { DESTINATIONS, ORIGINS, PRESETS } from './catalog.mjs';
import { createCandidateEngine, DomainError, fail, stringList, destinationKey, drawCandidate as drawFromPool } from './candidate-core.mjs';

export { DomainError };
const { normalizeFilters, filteredPool, candidatePool: buildCandidatePool } = createCandidateEngine({
  origins: ORIGINS,
  presets: PRESETS,
  customId: name => `custom-${createHash('sha256').update(name).digest('hex').slice(0, 16)}`
});
export { normalizeFilters };

export function candidatePool(input = {}, catalog = DESTINATIONS) {
  return buildCandidatePool(input, catalog);
}

export function drawCandidate(candidates, randomIndex = randomInt) {
  return drawFromPool(candidates, randomIndex);
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
    // An undecided round must use the current catalog, including updated cost facts.
    // Finished rounds keep their original draw so retries can never pick a new winner.
    if (copy.room.phase !== 'drawn') {
      const previous = JSON.stringify(copy.room.candidates);
      this.#refresh(copy.room, { reset: false });
      if (previous !== JSON.stringify(copy.room.candidates)) {
        copy.room.version += 1;
        copy.room.members.forEach(member => { member.ready = false; });
        copy.room.phase = 'collecting';
      }
    }
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
