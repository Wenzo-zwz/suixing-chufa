import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { DESTINATIONS, ORIGINS, THEMES, PROVINCES, PRESETS } from '../prototype/catalog.mjs';
import { candidatePool, drawCandidate, DomainError, RoomStore } from '../prototype/domain.mjs';

const JSON_LIMIT = 64 * 1024;
const MAX_ATTEMPTS = 10;
const ALLOWED_HEADERS = ['content-type', 'x-travel-client', 'x-travel-token'];
const DISCLAIMER = '这是有限的演示目的地目录，并非全国全量资料。当地消费标签为演示参考，不是实际价格承诺，也不含往返交通；距离为地理直线距离。没有接入实时天气、班次、票价或余票，开放与预订可用性请在出发前查询。';

async function requestIdentity(request, db) {
  const publicId = request.headers.get('x-travel-client');
  const token = request.headers.get('x-travel-token');
  if (!publicId || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(publicId) || !token || !/^[0-9a-f]{64}$/.test(token)) {
    throw new DomainError('缺少有效的本地成员身份', 'INVALID_IDENTITY');
  }
  const clientId = publicId.toLowerCase();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await db.prepare('INSERT INTO travel_clients (client_id, token_hash) VALUES (?, ?) ON CONFLICT(client_id) DO NOTHING').bind(clientId, tokenHash).run();
  const existing = await db.prepare('SELECT token_hash FROM travel_clients WHERE client_id = ?').bind(clientId).first();
  const encode = new TextEncoder();
  if (!existing || existing.token_hash.length !== tokenHash.length || !timingSafeEqual(encode.encode(existing.token_hash), encode.encode(tokenHash))) {
    throw new DomainError('本地成员凭据不匹配，请使用原浏览器身份', 'INVALID_IDENTITY', 403);
  }
  return clientId;
}

async function readJson(request) {
  const tooLarge = () => new DomainError('请求内容过大，请精简自填名单', 'PAYLOAD_TOO_LARGE', 413);
  const declaredSize = Number(request.headers.get('content-length'));
  if (declaredSize > JSON_LIMIT) throw tooLarge();
  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > JSON_LIMIT) {
        await reader.cancel();
        throw tooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!size) return {};
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let value;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new DomainError('请求需要有效的 JSON', 'INVALID_JSON'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainError('请求内容需要是 JSON 对象');
  return value;
}

function roomNotFound() {
  return new DomainError('没有找到这个房间，请检查邀请码', 'ROOM_NOT_FOUND', 404);
}

function roomBusy() {
  return new DomainError('房间正在更新，请稍后重试', 'ROOM_BUSY', 409);
}

async function createRoom(db, input) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const store = new RoomStore();
    const room = store.create(input);
    const record = JSON.stringify(store.exportRecord(room.inviteCode));
    const result = await db.prepare('INSERT INTO travel_rooms (code, revision, record, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(code) DO NOTHING').bind(room.inviteCode, record, Date.now()).run();
    if (result.meta.changes === 1) return room;
  }
  throw roomBusy();
}

async function loadRoom(db, code) {
  const row = await db.prepare('SELECT code, revision, record FROM travel_rooms WHERE code = ?').bind(code).first();
  if (!row) throw roomNotFound();
  const record = JSON.parse(row.record);
  const store = new RoomStore();
  store.importRecord(record);
  return { row, record, store };
}

async function mutateRoom(db, code, action, input) {
  let roomId;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const { row, record, store } = await loadRoom(db, code);
    if (roomId && roomId !== record.room.id) throw roomNotFound();
    roomId = record.room.id;
    const room = action === 'leave' ? store.leave(code, input.clientId) : store[action](code, input);
    const nextRecord = JSON.stringify(store.exportRecord(code));
    if (nextRecord === row.record) return room;
    // The independent revision covers readiness/nicknames; room.id also guards code reuse.
    const result = room.left
      ? await db.prepare("DELETE FROM travel_rooms WHERE code = ? AND revision = ? AND json_extract(record, '$.room.id') = ?").bind(code, row.revision, roomId).run()
      : await db.prepare("UPDATE travel_rooms SET record = ?, revision = revision + 1, updated_at = ? WHERE code = ? AND revision = ? AND json_extract(record, '$.room.id') = ?").bind(nextRecord, Date.now(), code, row.revision, roomId).run();
    if (result.meta.changes === 1) return room;
    // Discard speculative state, including draws, and rerun against the persisted winner.
  }
  throw roomBusy();
}

/**
 * @param {Request} request
 * @param {D1Database | undefined} db
 * @param {{ allowedOrigins?: string[] }} [options]
 */
export async function handleApi(request, db, { allowedOrigins = [] } = {}) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    vary: 'Origin'
  });
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers });
  try {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    if (origin) {
      if (![url.origin, ...allowedOrigins].includes(origin)) throw new DomainError('此来源无权访问服务', 'CORS_ORIGIN_DENIED', 403);
      headers.set('access-control-allow-origin', origin);
    }
    if (request.method === 'OPTIONS') {
      const method = request.headers.get('access-control-request-method');
      if (!origin || !method) throw new DomainError('预检请求需要来源和请求方法', 'INVALID_PREFLIGHT');
      if (!['GET', 'POST'].includes(method)) throw new DomainError('此接口不支持该方法', 'METHOD_NOT_ALLOWED', 405);
      const requestedHeaders = request.headers.get('access-control-request-headers');
      if (requestedHeaders && requestedHeaders.split(',').some(header => !ALLOWED_HEADERS.includes(header.trim().toLowerCase()))) {
        throw new DomainError('预检请求包含不支持的请求头', 'INVALID_PREFLIGHT');
      }
      headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
      headers.set('access-control-allow-headers', ALLOWED_HEADERS.join(', '));
      headers.set('access-control-max-age', '600');
      headers.set('vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
      return new Response(null, { status: 204, headers });
    }
    const { pathname } = url;
    if (request.method === 'GET' && pathname === '/api/health') {
      try {
        await Promise.all([
          db.prepare('SELECT code FROM travel_rooms LIMIT 1').first(),
          db.prepare('SELECT client_id FROM travel_clients LIMIT 1').first()
        ]);
      } catch {
        return json(503, { error: '云端房间暂不可用，请稍后重试', code: 'SERVICE_UNAVAILABLE' });
      }
      return json(200, { status: 'ok' });
    }
    if (request.method === 'GET' && pathname === '/api/catalog') {
      return json(200, { destinations: DESTINATIONS, origins: ORIGINS, themes: THEMES, provinces: PROVINCES, presets: PRESETS, disclaimer: DISCLAIMER });
    }
    if (request.method === 'POST' && ['/api/candidates', '/api/draw', '/api/rooms'].includes(pathname)) {
      const clientId = await requestIdentity(request, db);
      const body = await readJson(request);
      if (pathname === '/api/candidates') return json(200, candidatePool(body.filters));
      if (pathname === '/api/draw') {
        const pool = candidatePool(body.filters);
        return json(200, { destination: drawCandidate(pool.candidates), poolSize: pool.candidates.length, candidateNames: pool.candidates.map(item => item.name), drawId: randomUUID(), createdAt: new Date().toISOString() });
      }
      return json(201, await createRoom(db, { clientId, nickname: body.nickname, filters: body.filters }));
    }
    const route = pathname.match(/^\/api\/rooms\/([A-Za-z0-9_-]+)(?:\/(join|member|ready|draw|leave|next))?$/);
    if (route) {
      const [, rawCode, action] = route;
      const code = rawCode.toUpperCase();
      const clientId = await requestIdentity(request, db);
      if (request.method === 'GET' && !action) {
        const { store } = await loadRoom(db, code);
        return json(200, store.read(code, clientId));
      }
      if (request.method === 'POST' && action) {
        const body = await readJson(request);
        return json(200, await mutateRoom(db, code, action === 'member' ? 'update' : action, { clientId, nickname: body.nickname, filters: body.filters, version: body.version }));
      }
      throw new DomainError('此房间路径不支持该方法', 'METHOD_NOT_ALLOWED', 405);
    }
    throw new DomainError('没有找到该接口', 'NOT_FOUND', 404);
  } catch (error) {
    if (error instanceof DomainError) return json(error.status, { error: error.message, code: error.code });
    // Internal exceptions may contain bound SQL values; never return or log credentials.
    return json(500, { error: '云端服务遇到错误，请稍后重试', code: 'INTERNAL_ERROR' });
  }
}
