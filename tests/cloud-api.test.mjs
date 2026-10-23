import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RoomStore } from '../prototype/domain.mjs';

const ORIGIN = 'https://travel.example';
const PAGES = 'https://wenzo-zwz.github.io';
const alice = { id: randomUUID(), token: 'a'.repeat(64) };
const bob = { id: randomUUID(), token: 'b'.repeat(64) };
const charlie = { id: randomUUID(), token: 'c'.repeat(64) };
const schema = `
  CREATE TABLE IF NOT EXISTS travel_clients (client_id TEXT PRIMARY KEY, token_hash TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS travel_rooms (code TEXT PRIMARY KEY, revision INTEGER NOT NULL, record TEXT NOT NULL, updated_at INTEGER NOT NULL);
`;

function sqliteD1(filename = ':memory:', initialize = true) {
  const sqlite = new DatabaseSync(filename);
  if (initialize) sqlite.exec(schema);
  let barrier;
  const db = {
    sqlite,
    conflicts: 0,
    occupyNextRoomCode: false,
    beforeRoomWrite: null,
    holdNextRoomReads(count = 2) {
      let release;
      const promise = new Promise(resolve => { release = resolve; });
      barrier = { remaining: count, promise, release };
    },
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      return {
        bind(...args) {
          return {
            async first() {
              const row = statement.get(...args) ?? null;
              if (barrier && /FROM travel_rooms WHERE code/i.test(sql)) {
                const current = barrier;
                current.remaining -= 1;
                if (current.remaining === 0) { barrier = null; current.release(); }
                await current.promise;
              }
              return row;
            },
            async run() {
              if (db.occupyNextRoomCode && /INSERT INTO travel_rooms/i.test(sql)) {
                db.occupyNextRoomCode = false;
                statement.run(...args);
              }
              if (db.beforeRoomWrite && /^(UPDATE|DELETE).*travel_rooms/i.test(sql.trim())) db.beforeRoomWrite(sql, args);
              const result = statement.run(...args);
              const changes = Number(result.changes);
              if (/^(UPDATE|DELETE).*travel_rooms/i.test(sql.trim()) && changes === 0) db.conflicts += 1;
              return { success: true, meta: { changes } };
            }
          };
        },
        async first() { return statement.get() ?? null; }
      };
    },
    close() { sqlite.close(); }
  };
  return db;
}

async function api(db, path, { method = 'GET', client = alice, body, raw, headers = {}, ...requestOptions } = {}) {
  const cloudApi = await import('../server/cloud-api.mjs').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
    throw error;
  });
  assert.equal(typeof cloudApi?.handleApi, 'function', 'durable cloud API handler must exist');
  const response = await cloudApi.handleApi(new Request(ORIGIN + path, {
    method,
    headers: {
      ...(client ? { 'x-travel-client': client.id, 'x-travel-token': client.token } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers
    },
    ...(raw !== undefined || body !== undefined ? { body: raw ?? JSON.stringify(body) } : {}),
    ...requestOptions
  }), db, { allowedOrigins: [PAGES, 'http://127.0.0.1:4177'] });
  return { status: response.status, headers: response.headers, body: response.status === 204 ? null : await response.json() };
}

function fixture(t) {
  const db = sqliteD1();
  t.after(() => db.close());
  return db;
}

async function createRoom(db) {
  const response = await api(db, '/api/rooms', { method: 'POST', body: { nickname: '甲', filters: { customNames: ['长沙', '杭州', '青岛'] } } });
  assert.equal(response.status, 201);
  return response.body;
}

async function twoMembers(db) {
  const created = await createRoom(db);
  const path = `/api/rooms/${created.inviteCode}`;
  const response = await api(db, path + '/join', { method: 'POST', client: bob, body: { nickname: '乙' } });
  assert.equal(response.status, 200);
  return { room: response.body, path };
}

test('RoomStore persistence clones trusted records and retains historical draw retries', () => {
  const source = new RoomStore({ randomIndex: () => 0 });
  const room = source.create({ clientId: alice.id, filters: { customNames: ['长沙', '杭州'] } });
  source.join(room.inviteCode, { clientId: bob.id });
  source.ready(room.inviteCode, { clientId: alice.id, version: 2 });
  source.ready(room.inviteCode, { clientId: bob.id, version: 2 });
  const drawn = source.draw(room.inviteCode, { clientId: alice.id, version: 2 });
  source.join(room.inviteCode, { clientId: charlie.id });
  assert.equal(typeof source.exportRecord, 'function', 'RoomStore needs a persistence bridge');
  const record = source.exportRecord(room.inviteCode);
  assert.deepEqual(Object.keys(record).sort(), ['drawVersion', 'room']);
  assert.equal(record.drawVersion, 2);
  const restored = new RoomStore({ randomIndex: () => 1 });
  restored.importRecord(record);
  record.room.members[0].nickname = 'outside mutation';
  const repeated = restored.draw(room.inviteCode, { clientId: alice.id, version: 2 });
  assert.deepEqual(repeated.history, drawn.history);
  assert.notEqual(repeated.members[0].nickname, 'outside mutation');
  const exported = restored.exportRecord(room.inviteCode);
  exported.room.members.length = 0;
  assert.equal(restored.read(room.inviteCode, alice.id).members.length, 3);
});

test('rooms and token bindings survive a closed SQLite connection and fresh handler calls', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'travel-api-'));
  const filename = join(directory, 'rooms.sqlite');
  t.after(() => rm(directory, { recursive: true, force: true }));
  let db = sqliteD1(filename);
  let room;
  try { room = await createRoom(db); } finally { db.close(); }
  db = sqliteD1(filename);
  try {
    const response = await api(db, `/api/rooms/${room.inviteCode}`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, room);
    const row = db.sqlite.prepare('SELECT token_hash FROM travel_clients WHERE client_id = ?').get(alice.id);
    assert.equal(row.token_hash, createHash('sha256').update(alice.token).digest('hex'));
    const serialized = JSON.stringify(response.body);
    assert.ok(!serialized.includes(alice.token));
    assert.ok(!serialized.includes(row.token_hash));
    assert.equal((await api(db, `/api/rooms/${room.inviteCode}`, { client: { ...alice, token: bob.token } })).status, 403);
  } finally { db.close(); }
});

test('same-version simultaneous readiness uses a separate CAS revision without losing a member update', async t => {
  const db = fixture(t);
  const { room, path } = await twoMembers(db);
  const before = db.sqlite.prepare('SELECT revision FROM travel_rooms WHERE code = ?').get(room.inviteCode).revision;
  db.holdNextRoomReads();
  const responses = await Promise.all([
    api(db, path + '/ready', { method: 'POST', body: { version: room.version } }),
    api(db, path + '/ready', { method: 'POST', client: bob, body: { version: room.version } })
  ]);
  assert.ok(responses.every(response => response.status === 200));
  const persisted = await api(db, path);
  assert.equal(persisted.body.version, room.version);
  assert.equal(persisted.body.phase, 'ready');
  assert.ok(persisted.body.members.every(member => member.ready));
  assert.equal(db.sqlite.prepare('SELECT revision FROM travel_rooms WHERE code = ?').get(room.inviteCode).revision, before + 2);
  assert.ok(db.conflicts >= 1, 'real SQLite update must reject one stale revision');
});

test('concurrent draws return one persisted winner and old draw version remains idempotent after join', async t => {
  const db = fixture(t);
  const { room, path } = await twoMembers(db);
  for (const client of [alice, bob]) assert.equal((await api(db, path + '/ready', { method: 'POST', client, body: { version: room.version } })).status, 200);
  db.holdNextRoomReads();
  const [first, second] = await Promise.all([
    api(db, path + '/draw', { method: 'POST', body: { version: room.version } }),
    api(db, path + '/draw', { method: 'POST', client: bob, body: { version: room.version } })
  ]);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.deepEqual(first.body, second.body);
  assert.equal(first.body.history.length, 1);
  assert.ok(db.conflicts >= 1);
  const joined = await api(db, path + '/join', { method: 'POST', client: charlie, body: { nickname: '丙' } });
  assert.equal(joined.status, 200);
  const repeated = await api(db, path + '/draw', { method: 'POST', client: bob, body: { version: room.version } });
  assert.equal(repeated.status, 200);
  assert.deepEqual(repeated.body.history, first.body.history);
  assert.deepEqual((await api(db, path)).body.history, first.body.history);
});

test('CAS retry rechecks the original candidate version after a concurrent filter change', async t => {
  const db = fixture(t);
  const { room, path } = await twoMembers(db);
  db.holdNextRoomReads();
  const [updated, ready] = await Promise.all([
    api(db, path + '/member', { method: 'POST', body: { version: room.version, filters: { customNames: ['杭州'] } } }),
    api(db, path + '/ready', { method: 'POST', client: bob, body: { version: room.version } })
  ]);
  assert.equal(updated.status, 200);
  assert.equal(ready.status, 409);
  assert.equal(ready.body.code, 'VERSION_CONFLICT');
  assert.ok((await api(db, path)).body.members.every(member => !member.ready));
  assert.ok(db.conflicts >= 1);
});

test('bounded conflict retries do not overwrite authoritative state', async t => {
  const db = fixture(t);
  const { room, path } = await twoMembers(db);
  db.beforeRoomWrite = () => db.sqlite.prepare('UPDATE travel_rooms SET revision = revision + 1 WHERE code = ?').run(room.inviteCode);
  const response = await api(db, path + '/ready', { method: 'POST', body: { version: room.version } });
  assert.equal(response.status, 409);
  assert.equal(response.body.code, 'ROOM_BUSY');
  assert.ok(db.conflicts >= 2 && db.conflicts <= 12);
  assert.ok((await api(db, path)).body.members.every(member => !member.ready));
});

test('room generation guards reject an in-flight mutation when an invitation code is reused', async t => {
  const db = fixture(t);
  const room = await createRoom(db);
  const path = `/api/rooms/${room.inviteCode}`;
  const replacement = { room: { ...structuredClone(room), id: randomUUID() }, drawVersion: null };
  replacement.room.members[0].nickname = 'replacement';
  db.beforeRoomWrite = () => {
    db.beforeRoomWrite = null;
    db.sqlite.prepare('DELETE FROM travel_rooms WHERE code = ?').run(room.inviteCode);
    db.sqlite.prepare('INSERT INTO travel_rooms (code, revision, record, updated_at) VALUES (?, 1, ?, ?)').run(room.inviteCode, JSON.stringify(replacement), Date.now());
  };
  const response = await api(db, path + '/member', { method: 'POST', body: { version: room.version, nickname: 'stale request' } });
  assert.equal(response.status, 404);
  assert.equal(response.body.code, 'ROOM_NOT_FOUND');
  assert.deepEqual((await api(db, path)).body, replacement.room);
  assert.ok(db.conflicts >= 1);
});

test('concurrent final leave and join uses CAS deletion and preserves the joining member', async t => {
  const db = fixture(t);
  const room = await createRoom(db);
  const path = `/api/rooms/${room.inviteCode}`;
  db.holdNextRoomReads();
  // Queue join first so the stale final-leave DELETE must retry against the new membership.
  const [joined, left] = await Promise.all([
    api(db, path + '/join', { method: 'POST', client: bob, body: { nickname: '乙' } }),
    api(db, path + '/leave', { method: 'POST', body: {} })
  ]);
  assert.equal(joined.status, 200);
  assert.equal(left.status, 200);
  const persisted = await api(db, path, { client: bob });
  assert.equal(persisted.status, 200);
  assert.deepEqual(persisted.body.members.map(member => member.id), [bob.id]);
  assert.ok(db.conflicts >= 1);
  assert.deepEqual((await api(db, path + '/leave', { method: 'POST', client: bob, body: {} })).body, { left: true });
  assert.equal((await api(db, path, { client: bob })).status, 404);
  assert.equal(db.sqlite.prepare('SELECT count(*) AS total FROM travel_rooms').get().total, 0);
});

test('creation retries a real invitation-code uniqueness collision without replacing the existing row', async t => {
  const db = fixture(t);
  db.occupyNextRoomCode = true;
  const room = await createRoom(db);
  const rows = db.sqlite.prepare('SELECT code, record FROM travel_rooms').all();
  assert.equal(rows.length, 2);
  assert.equal(rows.filter(row => row.code === room.inviteCode).length, 1);
  assert.notEqual(JSON.parse(rows.find(row => row.code !== room.inviteCode).record).room.id, room.id);
});

test('public member IDs cannot be impersonated with missing, malformed or different private tokens', async t => {
  const db = fixture(t);
  const { room, path } = await twoMembers(db);
  for (const token of ['', 'A'.repeat(64), 'short', bob.token]) {
    const response = await api(db, path + '/member', { method: 'POST', client: { ...alice, token }, body: { nickname: 'spoof', version: room.version } });
    assert.equal(response.status, token === bob.token ? 403 : 400);
  }
  const spoofedBody = await api(db, path + '/member', { method: 'POST', client: bob, body: { clientId: alice.id, nickname: '乙改名', version: room.version } });
  assert.equal(spoofedBody.status, 200);
  assert.equal(spoofedBody.body.members.find(member => member.id === alice.id).nickname, '甲');
  assert.equal(spoofedBody.body.members.find(member => member.id === bob.id).nickname, '乙改名');
  assert.equal((await api(db, path, { client: charlie })).body.code, 'NOT_MEMBER');
  assert.equal((await api(db, '/api/draw', { method: 'POST', client: { id: 'public-name', token: alice.token }, body: {} })).body.code, 'INVALID_IDENTITY');
});

test('parallel first-use identity claims bind exactly one private token', async t => {
  const db = fixture(t);
  const id = randomUUID();
  const responses = await Promise.all([alice.token, bob.token].map(token => api(db, '/api/candidates', { method: 'POST', client: { id, token }, body: {} })));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 403]);
  assert.equal(db.sqlite.prepare('SELECT count(*) AS total FROM travel_clients WHERE client_id = ?').get(id).total, 1);
});

test('CORS reflects only configured or own origins and validates preflight methods and headers', async t => {
  const db = fixture(t);
  for (const origin of [PAGES, ORIGIN, 'http://127.0.0.1:4177']) {
    const response = await api(db, '/api/catalog', { client: null, headers: { origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.match(response.headers.get('vary'), /Origin/i);
  }
  for (const origin of ['https://evil.example', 'null', PAGES + '.evil.example']) {
    const response = await api(db, '/api/catalog', { client: null, headers: { origin } });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  }
  const headers = { origin: PAGES, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type, x-travel-client, x-travel-token' };
  const valid = await api(db, '/api/rooms', { method: 'OPTIONS', client: null, headers });
  assert.equal(valid.status, 204);
  assert.equal(valid.headers.get('access-control-allow-origin'), PAGES);
  assert.match(valid.headers.get('access-control-allow-headers'), /x-travel-token/i);
  assert.notEqual(valid.headers.get('access-control-allow-origin'), '*');
  assert.equal((await api(db, '/api/rooms', { method: 'OPTIONS', client: null, headers: { ...headers, 'access-control-request-method': 'DELETE' } })).status, 405);
  assert.equal((await api(db, '/api/rooms', { method: 'OPTIONS', client: null, headers: { ...headers, 'access-control-request-headers': 'authorization' } })).status, 400);
  assert.equal((await api(db, '/api/rooms', { method: 'OPTIONS', client: null, headers: { origin: PAGES } })).status, 400);
});

test('body limits count streamed bytes and preserve JSON, filter and stale-version errors', async t => {
  const db = fixture(t);
  const malformed = await api(db, '/api/candidates', { method: 'POST', raw: '{broken' });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.code, 'INVALID_JSON');
  assert.equal((await api(db, '/api/candidates', { method: 'POST', raw: '[]' })).status, 400);
  const stream = new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode('{"padding":"'));
    controller.enqueue(new TextEncoder().encode('中'.repeat(23000)));
    controller.enqueue(new TextEncoder().encode('"}'));
    controller.close();
  } });
  const tooLarge = await api(db, '/api/candidates', { method: 'POST', raw: stream, duplex: 'half' });
  assert.equal(tooLarge.status, 413);
  assert.equal(tooLarge.body.code, 'PAYLOAD_TOO_LARGE');
  const invalid = await api(db, '/api/candidates', { method: 'POST', body: { filters: { maxDistanceKm: -1 } } });
  assert.equal(invalid.status, 400);
  const { room, path } = await twoMembers(db);
  assert.equal((await api(db, path + '/ready', { method: 'POST', body: {} })).status, 400);
  const stale = await api(db, path + '/ready', { method: 'POST', body: { version: room.version - 1 } });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, 'VERSION_CONFLICT');
  assert.equal((await api(db, '/api/not-an-endpoint')).status, 404);
  assert.equal((await api(db, path, { method: 'POST', body: {} })).status, 405);
});

test('public catalog and solo draw retain their contracts and health checks actual database readiness', async t => {
  const db = fixture(t);
  const catalog = await api(db, '/api/catalog', { client: null });
  assert.equal(catalog.status, 200);
  assert.deepEqual(Object.keys(catalog.body).sort(), ['destinations', 'origins', 'themes', 'provinces', 'presets', 'disclaimer'].sort());
  const drawn = await api(db, '/api/draw', { method: 'POST', body: { filters: { customNames: ['长沙', '长沙', '杭州'] } } });
  assert.equal(drawn.status, 200);
  assert.equal(drawn.body.poolSize, 2);
  assert.deepEqual(drawn.body.candidateNames, ['长沙', '杭州']);
  assert.ok(drawn.body.drawId);
  assert.ok(Number.isFinite(Date.parse(drawn.body.createdAt)));
  assert.equal((await api(db, '/api/health', { client: null })).status, 200);
  const empty = sqliteD1(':memory:', false);
  try { assert.equal((await api(empty, '/api/health', { client: null })).status, 503); }
  finally { empty.close(); }
});

test('concurrent reads persist one pending-room guide migration and stale draw cannot use old budgets', async t => {
  const db=fixture(t);
  const {DESTINATIONS}=await import('../prototype/catalog.mjs');
  const legacy=new RoomStore({catalog:DESTINATIONS.map(item=>({...item,localBudget:{min:100,max:200}}))});
  const room=legacy.create({clientId:alice.id,filters:{customNames:['长沙','杭州','青岛'],maxBudget:380}});
  legacy.join(room.inviteCode,{clientId:bob.id});
  legacy.ready(room.inviteCode,{clientId:alice.id,version:2});legacy.ready(room.inviteCode,{clientId:bob.id,version:2});
  const before=JSON.stringify(legacy.exportRecord(room.inviteCode));
  db.sqlite.prepare('INSERT INTO travel_rooms(code,revision,record,updated_at) VALUES(?,1,?,?)').run(room.inviteCode,before,Date.now());
  const path=`/api/rooms/${room.inviteCode}`;
  assert.equal((await api(db,path,{client:charlie})).status,403);
  assert.equal(db.sqlite.prepare('SELECT record FROM travel_rooms WHERE code=?').get(room.inviteCode).record,before,'outsiders cannot persist a migration');
  db.holdNextRoomReads(2);
  const reads=await Promise.all([api(db,path),api(db,path,{client:bob})]);
  for(const response of reads){assert.equal(response.status,200);assert.equal(response.body.version,3);assert.equal(response.body.candidates.length,0);assert.ok(response.body.members.every(item=>!item.ready));}
  const row=db.sqlite.prepare('SELECT revision,record FROM travel_rooms WHERE code=?').get(room.inviteCode);
  assert.equal(row.revision,2,'one CAS migration wins');
  assert.equal(JSON.parse(row.record).room.version,3);
  assert.equal((await api(db,path+'/draw',{method:'POST',body:{version:2}})).body.code,'VERSION_CONFLICT');
  assert.equal((await api(db,path)).body.version,3,'a later load does not repeat the version increment');
});
