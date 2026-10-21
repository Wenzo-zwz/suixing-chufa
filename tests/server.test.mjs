import test from 'node:test';
import assert from 'node:assert/strict';

async function serve(t) {
  const module = await import('../prototype/server.mjs').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
    throw error;
  });
  assert.ok(module, 'HTTP application server implementation must exist');
  const server = module.createAppServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { method = 'GET', client = 'a', body, raw, headers = {} } = {}) {
    const response = await fetch(base + path, { method, headers: { 'x-travel-client': client, ...(body !== undefined || raw !== undefined ? { 'content-type': 'application/json' } : {}), ...headers }, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
    return { status: response.status, body: await response.json() };
  }
  return { base, request };
}

test('catalog and candidate HTTP responses expose the exact preview contract', async t => {
  const { request } = await serve(t);
  const catalog = await request('/api/catalog');
  assert.equal(catalog.status, 200);
  assert.deepEqual(Object.keys(catalog.body).sort(), ['destinations', 'origins', 'themes', 'provinces', 'presets', 'disclaimer'].sort());
  assert.match(catalog.body.disclaimer, /演示/);
  const nearby = await request('/api/candidates', { method: 'POST', body: { filters: { preset: 'near' } } });
  assert.equal(nearby.status, 200);
  assert.deepEqual(Object.keys(nearby.body).sort(), ['candidates', 'rejected', 'needsOrigin', 'note'].sort());
  assert.equal(nearby.body.needsOrigin, true);
});

test('single draws return one deduplicated candidate and honest metadata', async t => {
  const { request } = await serve(t);
  const result = await request('/api/draw', { method: 'POST', body: { filters: { customNames: ['长沙', '长沙', '杭州'] } } });
  assert.equal(result.status, 200);
  assert.equal(result.body.poolSize, 2);
  assert.deepEqual(result.body.candidateNames, ['长沙', '杭州']);
  assert.ok(result.body.drawId);
  assert.ok(Number.isFinite(Date.parse(result.body.createdAt)));
  const empty = await request('/api/draw', { method: 'POST', body: { filters: { provinces: ['不存在地区'] } } });
  assert.equal(empty.status, 409);
  assert.equal(empty.body.code, 'NO_CANDIDATES');
});

test('real HTTP rooms enforce identities, confirmation and repeat draw consistency', async t => {
  const { request } = await serve(t);
  let response = await request('/api/rooms', { method: 'POST', body: { nickname: '房间甲', filters: {} } });
  assert.equal(response.status, 201);
  let room = response.body;
  assert.deepEqual(Object.keys(room).sort(), ['id', 'inviteCode', 'version', 'round', 'phase', 'members', 'candidates', 'destination', 'history', 'rejected'].sort());
  assert.ok(room.rejected.length > 0);
  assert.ok(room.rejected.every(item => typeof item.name === 'string' && typeof item.reason === 'string'));
  assert.ok(room.rejected.some(item => item.reason.includes('房间甲：目的地类型不符')));
  assert.deepEqual(Object.keys(room.members[0]).sort(), ['id', 'nickname', 'ready', 'filters'].sort());
  const route = `/api/rooms/${room.inviteCode}`;
  assert.equal((await request(route, { client: 'outsider' })).status, 403);
  response = await request(route + '/join', { method: 'POST', client: 'b', body: { nickname: '房间乙', filters: {} } });
  assert.equal(response.status, 200);
  room = response.body;
  const stale = room.version;
  assert.equal((await request(route + '/draw', { method: 'POST', body: { version: room.version } })).status, 409);
  room = (await request(route + '/ready', { method: 'POST', body: { version: room.version } })).body;
  room = (await request(route + '/member', { method: 'POST', client: 'b', body: { nickname: '房间乙', filters: { customNames: ['长沙', '杭州'] }, version: room.version, clientId: 'a' } })).body;
  assert.ok(room.members.every(item => !item.ready));
  assert.equal(room.members.find(item => item.id === 'a').nickname, '房间甲');
  response = await request(route + '/ready', { method: 'POST', body: { version: stale } });
  assert.equal(response.status, 409);
  assert.equal(response.body.code, 'VERSION_CONFLICT');
  room = (await request(route + '/ready', { method: 'POST', body: { version: room.version } })).body;
  room = (await request(route + '/ready', { method: 'POST', client: 'b', body: { version: room.version } })).body;
  const version = room.version;
  const [first, repeated] = await Promise.all([
    request(route + '/draw', { method: 'POST', body: { version } }),
    request(route + '/draw', { method: 'POST', client: 'b', body: { version } })
  ]);
  assert.equal(first.status, 200);
  assert.equal(repeated.status, 200);
  assert.deepEqual(first.body.destination, repeated.body.destination);
  assert.equal(first.body.history.length, 1);
  room = (await request(route + '/leave', { method: 'POST', client: 'b', body: {} })).body;
  assert.equal(room.history.length, 1);
  room = (await request(route + '/next', { method: 'POST', body: { version: room.version } })).body;
  assert.equal(room.round, 2);
  assert.equal(room.destination, null);
});

test('HTTP rejects missing identity, malformed JSON, oversized payloads and stale/missing versions', async t => {
  const { request } = await serve(t);
  const missing = await request('/api/rooms', { method: 'POST', client: '', body: { nickname: 'test', filters: {} } });
  assert.equal(missing.status, 400);
  const bad = await request('/api/draw', { method: 'POST', raw: '{broken' });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.error && bad.body.code);
  const tooLarge = await request('/api/candidates', { method: 'POST', body: { filters: { customNames: ['x'.repeat(70000)] } } });
  assert.equal(tooLarge.status, 413);
  const invalid = await request('/api/candidates', { method: 'POST', body: { filters: { maxDistanceKm: -1 } } });
  assert.equal(invalid.status, 400);
  const room = (await request('/api/rooms', { method: 'POST', body: { nickname: 'a', filters: {} } })).body;
  const noVersion = await request(`/api/rooms/${room.inviteCode}/ready`, { method: 'POST', body: {} });
  assert.equal(noVersion.status, 400);
});

test('joining an invitation without filters copies its proposal without automatic readiness', async t => {
  const { request } = await serve(t);
  const room = (await request('/api/rooms', { method: 'POST', body: { nickname: '甲', filters: { preset: 'near', originId: 'changsha', kind: 'spot' } } })).body;
  const response = await request(`/api/rooms/${room.inviteCode}/join`, { method: 'POST', client: 'b', body: { nickname: '乙' } });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.members[1].filters, response.body.members[0].filters);
  assert.ok(response.body.candidates.length > 0);
  assert.ok(response.body.members.every(item => !item.ready));
});

test('HTTP room nominations combine names before applying every member restriction', async t => {
  const { request } = await serve(t);
  const room = (await request('/api/rooms', { method: 'POST', body: { nickname: '甲', filters: { customNames: ['长沙', '杭州'], themeIds: ['food', 'culture'] } } })).body;
  const joined = await request(`/api/rooms/${room.inviteCode}/join`, { method: 'POST', client: 'b', body: { nickname: '乙', filters: { customNames: ['杭州', '青岛'], provinces: ['湖南'] } } });
  assert.equal(joined.status, 200);
  assert.deepEqual(joined.body.candidates.map(item => item.name), ['长沙']);
});

test('HTTP enforces the twenty-name member limit and ten-member room capacity', async t => {
  const { request } = await serve(t);
  const names = Array.from({ length: 21 }, (_, index) => `成员候选-${index}`);
  const overflow = await request('/api/rooms', { method: 'POST', body: { nickname: '甲', filters: { customNames: names } } });
  assert.equal(overflow.status, 400);
  assert.match(overflow.body.error, /20/);
  const room = (await request('/api/rooms', { method: 'POST', client: 'a0', body: { nickname: '甲', filters: {} } })).body;
  const route = `/api/rooms/${room.inviteCode}`;
  for (let index = 1; index < 10; index += 1) assert.equal((await request(route + '/join', { method: 'POST', client: `a${index}`, body: { nickname: `成员${index}` } })).status, 200);
  const full = await request(route + '/join', { method: 'POST', client: 'a10', body: { nickname: '第十一人' } });
  assert.equal(full.status, 409);
  assert.equal(full.body.code, 'ROOM_FULL');
  assert.equal((await request(route, { client: 'a0' })).body.members.length, 10);
});

test('only files inside the prototype static directory can be served', async t => {
  const { base, request } = await serve(t);
  const staticResponse = await fetch(base + '/catalog.mjs');
  assert.equal(staticResponse.status, 200);
  assert.match(staticResponse.headers.get('content-type'), /javascript/);
  assert.match(await staticResponse.text(), /DESTINATIONS/);
  for (const path of ['/%2e%2e%2fpackage.json', '/%2e%2e%5cpackage.json', '/.superpowers/sdd/task-1-brief.md']) {
    const response = await fetch(base + path);
    assert.ok([400, 403, 404].includes(response.status));
  }
  const unknown = await request('/api/not-a-route');
  assert.equal(unknown.status, 404);
  assert.ok(unknown.body.error && unknown.body.code);
});
