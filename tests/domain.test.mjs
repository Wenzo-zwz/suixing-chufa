import test from 'node:test';
import assert from 'node:assert/strict';

async function domain() {
  const module = await import('../prototype/domain.mjs').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
    throw error;
  });
  assert.ok(module, 'candidate and room domain implementation must exist');
  return module;
}

const destination = (id, name, province, themes, extra = {}) => ({
  id, name, province, city: name, kind: 'city', coordinates: { lat: 28.2282, lng: 112.9388 },
  themes, tier: 'comfort', localBudget: { min: 100, max: 250 }, ...extra
});
const fixture = [
  destination('changsha', '长沙', '湖南', ['food']),
  destination('hangzhou', '杭州', '浙江', ['nature', 'culture'], { coordinates: { lat: 30.2741, lng: 120.1551 }, tier: 'premium' }),
  destination('qingdao', '青岛', '山东', ['coast'], { coordinates: { lat: 36.0671, lng: 120.3826 } }),
  destination('near-spot', '橘子洲', '湖南', ['nature'], { kind: 'spot', coordinates: { lat: 28.1843, lng: 112.9573 }, localBudget: { min: 30, max: 100 } })
];
const member = (clientId, extra = {}) => ({ clientId, nickname: clientId, filters: {}, ...extra });

test('catalog provides honest demo coverage and short trips for common origins', async () => {
  await domain();
  const { DESTINATIONS, ORIGINS, PRESETS } = await import('../prototype/catalog.mjs');
  const cities = DESTINATIONS.filter(item => item.kind === 'city');
  assert.ok(cities.length >= 18);
  assert.ok(new Set(cities.map(item => item.province)).size >= 12);
  for (const name of ['长沙', '北京', '杭州', '成都']) {
    assert.ok(ORIGINS.some(origin => origin.name === name));
    assert.ok(DESTINATIONS.filter(item => item.kind === 'spot' && item.city === name).length >= 2);
  }
  assert.deepEqual(PRESETS.map(preset => preset.id), ['near', 'explore', 'enjoy']);
  const fields = ['id', 'name', 'province', 'city', 'kind', 'coordinates', 'themes', 'tier', 'tagline', 'description', 'highlights', 'foods', 'seasons', 'climate', 'travel', 'days', 'localBudget', 'art', 'sourceUrl', 'sourceLabel', 'dataNote'];
  for (const item of DESTINATIONS) {
    assert.deepEqual(Object.keys(item).sort(), fields.sort());
    assert.match(item.dataNote, /演示/);
    assert.match(item.travel, /实时|查询|核实/);
    if (item.localBudget) assert.match(item.localBudget.label, /演示/);
  }
});

test('custom duplicate names do not increase a destination weight', async () => {
  const { candidatePool } = await domain();
  const pool = candidatePool({ customNames: ['长沙', '长沙', ' 杭州 '] }, fixture);
  assert.deepEqual(pool.candidates.map(item => item.name), ['长沙', '杭州']);
});

test('catalog duplicates cannot increase final candidate weight', async () => {
  const { candidatePool } = await domain();
  const pool = candidatePool({}, [...fixture, { ...fixture[0], id: 'duplicate-city' }]);
  assert.equal(pool.candidates.filter(item => item.name === '长沙').length, 1);
});

test('national discovery is independent of an origin or nearby radius', async () => {
  const { candidatePool } = await domain();
  const pool = candidatePool({ preset: 'explore', originId: 'changsha' }, fixture);
  assert.deepEqual(pool.candidates.map(item => item.name), ['长沙', '杭州', '青岛']);
});

test('nearby needs an origin instead of claiming a nationwide pool is nearby', async () => {
  const { candidatePool } = await domain();
  const pool = candidatePool({ preset: 'near', originId: '' }, fixture);
  assert.equal(pool.needsOrigin, true);
  assert.equal(pool.candidates.length, 0);
});

test('nearby filters actual geographic distance and explicitly describes it', async () => {
  const { candidatePool } = await domain();
  const pool = candidatePool({ preset: 'near', originId: 'changsha' }, fixture);
  assert.deepEqual(pool.candidates.map(item => item.name), ['橘子洲']);
  assert.match(pool.note, /120/);
  assert.match(pool.note, /地理|直线/);
});

test('theme choices match any selected theme', async () => {
  const { candidatePool } = await domain();
  const pool = candidatePool({ themeIds: ['food', 'coast'] }, fixture);
  assert.deepEqual(pool.candidates.map(item => item.name), ['长沙', '青岛']);
});

test('province, budget ceiling and exclusions apply to the final pool', async () => {
  const { candidatePool } = await domain();
  assert.deepEqual(candidatePool({ provinces: ['浙江'] }, fixture).candidates.map(item => item.name), ['杭州']);
  assert.deepEqual(candidatePool({ kind: 'spot', maxBudget: 100 }, fixture).candidates.map(item => item.name), ['橘子洲']);
  assert.equal(candidatePool({ maxBudget: 200 }, fixture).candidates.length, 0);
  assert.deepEqual(candidatePool({ excludedIds: ['hangzhou'] }, fixture).candidates.map(item => item.name), ['长沙', '青岛']);
});

test('unknown custom names remain honest custom destinations', async () => {
  const { candidatePool } = await domain();
  const item = candidatePool({ customNames: ['我的秘密基地', ' 我的秘密基地 '] }, fixture).candidates[0];
  assert.equal(item.name, '我的秘密基地');
  assert.equal(item.coordinates, null);
  assert.equal(item.localBudget, null);
  assert.equal(item.sourceUrl, '');
  assert.match(item.dataNote, /自填|自定义/);
  assert.equal(candidatePool({ customNames: ['我的秘密基地'], maxBudget: 300 }, fixture).candidates.length, 0);
});

test('an explicit custom shortlist can mix cities and places without preset tiers hiding names', async () => {
  const { candidatePool } = await domain();
  const pool = candidatePool({ preset: 'enjoy', customNames: ['橘子洲', '我的秘密基地', '长沙'] }, fixture);
  assert.deepEqual(pool.candidates.map(item => item.name), ['橘子洲', '我的秘密基地', '长沙']);
  assert.equal(candidatePool({ customNames: ['橘子洲', '我的秘密基地'], provinces: ['湖南'] }, fixture).candidates.length, 1);
});

test('unsafe or malformed filters are rejected with useful domain errors', async () => {
  const { candidatePool } = await domain();
  for (const filters of [null, [], { maxBudget: -10 }, { maxDistanceKm: 'fast' }, { themeIds: 'food' }, { kind: 'hotel' }, { originId: 'unknown' }]) {
    assert.throws(() => candidatePool(filters, fixture), error => error.status === 400 && Boolean(error.code));
  }
});

test('drawing asks for one unbiased index on the final deduplicated pool', async () => {
  const { candidatePool, drawCandidate } = await domain();
  const pool = candidatePool({ customNames: ['长沙', '长沙', '杭州'] }, fixture).candidates;
  const sizes = [];
  assert.equal(drawCandidate(pool, size => { sizes.push(size); return 1; }).name, '杭州');
  assert.deepEqual(sizes, [2]);
  assert.equal(drawCandidate(pool, () => 0).name, '长沙');
  assert.throws(() => drawCandidate([]), /没有|候选/);
});

test('rooms require at least two members and all members ready', async () => {
  const { RoomStore } = await domain();
  const store = new RoomStore({ catalog: fixture, randomIndex: () => 0 });
  let room = store.create(member('a'));
  assert.throws(() => store.draw(room.inviteCode, { clientId: 'a', version: room.version }), error => error.status === 409);
  room = store.ready(room.inviteCode, { clientId: 'a', version: room.version });
  assert.equal(room.phase, 'collecting');
  room = store.join(room.inviteCode, member('b'));
  assert.ok(room.members.every(item => !item.ready));
  room = store.ready(room.inviteCode, { clientId: 'a', version: room.version });
  assert.throws(() => store.draw(room.inviteCode, { clientId: 'a', version: room.version }), error => error.status === 409);
  room = store.ready(room.inviteCode, { clientId: 'b', version: room.version });
  assert.equal(room.phase, 'ready');
});

test('member conditions produce the common eligible pool', async () => {
  const { RoomStore } = await domain();
  const store = new RoomStore({ catalog: fixture });
  let room = store.create(member('a', { filters: { themeIds: ['food', 'culture'] } }));
  room = store.join(room.inviteCode, member('b', { filters: { provinces: ['浙江'] } }));
  assert.deepEqual(room.candidates.map(item => item.name), ['杭州']);
});

test('shared nominations are a union but every member restriction still applies', async () => {
  const { RoomStore } = await domain();
  const store = new RoomStore({ catalog: fixture });
  let room = store.create(member('a', { filters: { customNames: ['长沙', '杭州'], themeIds: ['food', 'culture'] } }));
  room = store.join(room.inviteCode, member('b', { filters: { customNames: ['杭州', '青岛'], provinces: ['湖南'] } }));
  assert.deepEqual(room.candidates.map(item => item.name), ['长沙']);
  assert.deepEqual(room.members[1].filters.customNames, ['杭州', '青岛']);
});

test('ten room members can contribute the full 200-item union without increasing duplicate weight', async () => {
  const { RoomStore } = await domain();
  const store = new RoomStore();
  const nominations = number => Array.from({ length: 20 }, (_, index) => `候选-${number}-${index}`);
  let room = store.create(member('a0', { filters: { customNames: nominations(0) } }));
  for (let index = 1; index < 10; index += 1) room = store.join(room.inviteCode, member(`a${index}`, { filters: { customNames: nominations(index) } }));
  assert.equal(room.members.length, 10);
  assert.equal(room.candidates.length, 200);
  room = store.update(room.inviteCode, member('a9', { version: room.version, filters: { customNames: nominations(0) } }));
  assert.equal(room.candidates.length, 180);
});

test('personal nominations accept 100 items and reject overflow without truncation', async () => {
  const { candidatePool } = await domain();
  const names = Array.from({ length: 101 }, (_, index) => `个人候选-${index}`);
  assert.equal(candidatePool({ customNames: names.slice(0, 100) }).candidates.length, 100);
  assert.throws(() => candidatePool({ customNames: names }), error => error.status === 400 && /100/.test(error.message));
});

test('room nomination limits reject create, join and update overflow without changing the proposal', async () => {
  const { RoomStore } = await domain();
  const store = new RoomStore();
  const names = Array.from({ length: 21 }, (_, index) => `成员候选-${index}`);
  assert.throws(() => store.create(member('too-many', { filters: { customNames: names } })), error => error.status === 400 && /20/.test(error.message));
  let room = store.create(member('a', { filters: { customNames: names.slice(0, 20) } }));
  assert.throws(() => store.join(room.inviteCode, member('b', { filters: { customNames: names } })), error => error.status === 400);
  assert.equal(store.read(room.inviteCode, 'a').members.length, 1);
  room = store.ready(room.inviteCode, { clientId: 'a', version: room.version });
  assert.throws(() => store.update(room.inviteCode, member('a', { version: room.version, filters: { customNames: names } })), error => error.status === 400);
  assert.deepEqual(store.read(room.inviteCode, 'a'), room);
});

test('room capacity is ten members and existing-member join retries remain idempotent', async () => {
  const { RoomStore } = await domain();
  const store = new RoomStore();
  let room = store.create(member('a0'));
  for (let index = 1; index < 10; index += 1) room = store.join(room.inviteCode, member(`a${index}`));
  assert.throws(() => store.join(room.inviteCode, member('a10')), error => error.status === 409 && error.code === 'ROOM_FULL');
  assert.deepEqual(store.join(room.inviteCode, member('a0')), room);
  room = store.leave(room.inviteCode, 'a9');
  room = store.join(room.inviteCode, member('a10'));
  assert.equal(room.members.length, 10);
});

test('invited members inherit the current proposal when filters are omitted and must still confirm', async () => {
  const { RoomStore } = await domain();
  const store = new RoomStore({ catalog: fixture });
  let room = store.create(member('a', { filters: { preset: 'near', originId: 'changsha' } }));
  room = store.ready(room.inviteCode, { clientId: 'a', version: room.version });
  room = store.join(room.inviteCode, { clientId: 'b', nickname: '邀请成员' });
  assert.deepEqual(room.members[1].filters, room.members[0].filters);
  assert.ok(room.members.every(item => !item.ready));
  assert.deepEqual(room.candidates.map(item => item.name), ['橘子洲']);
});

test('updating member conditions cancels readiness and rejects stale versions', async () => {
  const { RoomStore } = await domain();
  const store = new RoomStore({ catalog: fixture });
  let room = store.create(member('a'));
  room = store.join(room.inviteCode, member('b'));
  const stale = room.version;
  room = store.ready(room.inviteCode, { clientId: 'a', version: room.version });
  room = store.update(room.inviteCode, member('b', { version: room.version, filters: { provinces: ['湖南'] } }));
  assert.equal(room.phase, 'collecting');
  assert.ok(room.members.every(item => !item.ready));
  assert.ok(room.version > stale);
  assert.throws(() => store.ready(room.inviteCode, { clientId: 'a', version: stale }), error => error.status === 409 && error.code === 'VERSION_CONFLICT');
});

test('repeat draws from two members return one result and spend one random index', async () => {
  const { RoomStore } = await domain();
  let calls = 0;
  const store = new RoomStore({ catalog: fixture, randomIndex: () => { calls += 1; return 1; } });
  let room = store.create(member('a'));
  room = store.join(room.inviteCode, member('b'));
  room = store.ready(room.inviteCode, { clientId: 'a', version: room.version });
  room = store.ready(room.inviteCode, { clientId: 'b', version: room.version });
  const requestVersion = room.version;
  const first = store.draw(room.inviteCode, { clientId: 'a', version: requestVersion });
  const second = store.draw(room.inviteCode, { clientId: 'b', version: requestVersion });
  assert.deepEqual(second.destination, first.destination);
  assert.equal(second.history.length, 1);
  assert.equal(calls, 1);
});

test('outsiders cannot read or modify a room', async () => {
  const { RoomStore } = await domain();
  const store = new RoomStore({ catalog: fixture });
  const room = store.create(member('a'));
  for (const operation of [() => store.read(room.inviteCode, 'outsider'), () => store.ready(room.inviteCode, { clientId: 'outsider', version: room.version }), () => store.leave(room.inviteCode, 'outsider')]) {
    assert.throws(operation, error => error.status === 403);
  }
});

test('late join preserves the current result and joins the next round decision', async () => {
  const { RoomStore } = await domain();
  const store = new RoomStore({ catalog: fixture, randomIndex: () => 0 });
  let room = store.create(member('a'));
  room = store.join(room.inviteCode, member('b'));
  room = store.ready(room.inviteCode, { clientId: 'a', version: room.version });
  room = store.ready(room.inviteCode, { clientId: 'b', version: room.version });
  room = store.draw(room.inviteCode, { clientId: 'a', version: room.version });
  const original = room.destination;
  room = store.join(room.inviteCode, member('c', { filters: { provinces: ['浙江'] } }));
  assert.deepEqual(room.destination, original);
  assert.equal(room.phase, 'drawn');
  room = store.next(room.inviteCode, { clientId: 'a', version: room.version });
  assert.equal(room.round, 2);
  assert.equal(room.destination, null);
  assert.deepEqual(room.candidates.map(item => item.name), ['杭州']);
  assert.equal(room.history.length, 1);
  assert.ok(room.members.every(item => !item.ready));
});

test('leaving retains completed history for the remaining participants', async () => {
  const { RoomStore } = await domain();
  const store = new RoomStore({ catalog: fixture, randomIndex: () => 0 });
  let room = store.create(member('a'));
  room = store.join(room.inviteCode, member('b'));
  room = store.ready(room.inviteCode, { clientId: 'a', version: room.version });
  room = store.ready(room.inviteCode, { clientId: 'b', version: room.version });
  room = store.draw(room.inviteCode, { clientId: 'a', version: room.version });
  room = store.leave(room.inviteCode, 'a');
  assert.equal(room.history.length, 1);
  assert.deepEqual(store.read(room.inviteCode, 'b').destination, room.destination);
  assert.deepEqual(store.leave(room.inviteCode, 'b'), { left: true });
});

test('empty common pools cannot be confirmed or drawn', async () => {
  const { RoomStore } = await domain();
  const store = new RoomStore({ catalog: fixture });
  let room = store.create(member('a', { filters: { provinces: ['湖南'] } }));
  room = store.join(room.inviteCode, member('b', { filters: { provinces: ['浙江'] } }));
  assert.equal(room.candidates.length, 0);
  assert.throws(() => store.ready(room.inviteCode, { clientId: 'a', version: room.version }), error => error.status === 409 && error.code === 'NO_CANDIDATES');
});

test('room exclusion reasons identify each member and nickname refresh preserves readiness', async () => {
  const { RoomStore } = await domain();
  const store = new RoomStore({ catalog: fixture });
  let room = store.create(member('a', { filters: { provinces: ['湖南'] } }));
  room = store.join(room.inviteCode, member('b', { filters: { maxBudget: 250 } }));
  assert.deepEqual(room.candidates.map(item => item.name), ['长沙']);
  assert.match(room.rejected.find(item => item.name === '杭州').reason, /a：不在所选地区/);
  assert.match(room.rejected.find(item => item.name === '橘子洲').reason, /a：目的地类型不符.*b：目的地类型不符/);
  assert.ok(room.candidates.every(item => !room.rejected.some(rejected => rejected.name === item.name)));
  room = store.ready(room.inviteCode, { clientId: 'a', version: room.version });
  const version = room.version;
  room = store.update(room.inviteCode, { clientId: 'a', nickname: '新昵称', version });
  assert.equal(room.version, version);
  assert.equal(room.members.find(member => member.id === 'a').ready, true);
  assert.match(room.rejected.find(item => item.name === '杭州').reason, /新昵称：不在所选地区/);
});

test('callers cannot mutate stored room snapshots and repeated joins cannot add weight', async () => {
  const { RoomStore } = await domain();
  const store = new RoomStore({ catalog: fixture });
  const room = store.create(member('a'));
  const duplicate = store.join(room.inviteCode, member('a'));
  assert.equal(duplicate.members.length, 1);
  room.members[0].nickname = 'changed outside';
  room.candidates.length = 0;
  const stored = store.read(room.inviteCode, 'a');
  assert.equal(stored.members[0].nickname, 'a');
  assert.equal(stored.candidates.length, 3);
});
