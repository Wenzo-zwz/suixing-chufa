import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';

const base = process.argv[2];
if (!base) throw new Error('Usage: node tests/cloud-live.mjs <API origin>');
const origin = 'https://wenzo-zwz.github.io';
const identity = () => ({ 'x-travel-client': randomUUID(), 'x-travel-token': randomBytes(32).toString('hex') });
const a = identity(), b = identity();
const filters = { preset: 'explore', provinces: [], themeIds: [], customNames: ['长沙', '杭州', '成都'], kind: 'city' };
const checks = [];
let code;
async function call(path, client, body, status = 200) {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { origin, 'content-type': 'application/json', ...client },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(25000)
  });
  const data = await response.json();
  assert.equal(response.status, status, `${path}: ${JSON.stringify(data)}`);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  return data;
}
try {
  await call('/api/health');
  const preflight = await fetch(`${base}/api/rooms`, {
    method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type,x-travel-client,x-travel-token' },
    signal: AbortSignal.timeout(25000)
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  checks.push('D1 health and Pages CORS preflight');
  const pool = await call('/api/candidates', a, { filters });
  assert.equal(pool.candidates.length, 3);
  const solo = await call('/api/draw', a, { filters });
  assert.ok(filters.customNames.includes(solo.destination.name));
  checks.push('candidate filter and solo draw');
  const created = await call('/api/rooms', a, { nickname: '网页验证甲', filters }, 201);
  code = created.inviteCode;
  const joined = await call(`/api/rooms/${code}/join`, b, { nickname: '网页验证乙' });
  const version = joined.version;
  await Promise.all([call(`/api/rooms/${code}/ready`, a, { version }), call(`/api/rooms/${code}/ready`, b, { version })]);
  const ready = await call(`/api/rooms/${code}`, a);
  assert.equal(ready.phase, 'ready');
  assert.ok(ready.members.every(member => member.ready));
  const [drawA, drawB] = await Promise.all([call(`/api/rooms/${code}/draw`, a, { version }), call(`/api/rooms/${code}/draw`, b, { version })]);
  assert.equal(drawA.destination.id, drawB.destination.id);
  assert.equal(drawA.history.length, 1);
  assert.equal(drawA.history[0].drawId, drawB.history[0].drawId);
  const restored = await call(`/api/rooms/${code}`, b);
  assert.equal(restored.history[0].drawId, drawA.history[0].drawId);
  checks.push('concurrent readiness, one shared draw and persisted reload');
  await call(`/api/rooms/${code}`, { ...a, 'x-travel-token': b['x-travel-token'] }, undefined, 403);
  checks.push('public member ID cannot impersonate another member');
  console.log(JSON.stringify({ api: base, passed: checks.length, checks }, null, 2));
} finally {
  if (code) {
    await call(`/api/rooms/${code}/leave`, b, {}).catch(() => {});
    await call(`/api/rooms/${code}/leave`, a, {}).catch(() => {});
  }
}
