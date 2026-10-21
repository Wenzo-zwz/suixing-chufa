import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, realpath } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { DESTINATIONS, ORIGINS, THEMES, PROVINCES, PRESETS } from './catalog.mjs';
import { candidatePool, drawCandidate, DomainError, RoomStore } from './domain.mjs';

const STATIC_ROOT = fileURLToPath(new URL('.', import.meta.url));
const JSON_LIMIT = 64 * 1024;
const DISCLAIMER = '这是有限的演示目的地目录，并非全国全量资料。当地消费标签为演示参考，不是实际价格承诺，也不含往返交通；距离为地理直线距离。没有接入实时天气、班次、票价或余票，开放与预订可用性请在出发前查询。';
const CONTENT_TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon' };

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  response.end(JSON.stringify(body));
}

function requestIdentity(request) {
  const id = request.headers['x-travel-client'];
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new DomainError('缺少有效的本地成员身份', 'INVALID_IDENTITY');
  return id;
}

async function readJson(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > JSON_LIMIT) throw new DomainError('请求内容过大，请精简自填名单', 'PAYLOAD_TOO_LARGE', 413);
    chunks.push(chunk);
  }
  if (!size) return {};
  let value;
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new DomainError('请求需要有效的 JSON', 'INVALID_JSON'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainError('请求内容需要是 JSON 对象');
  return value;
}

function insideRoot(filename) {
  const relative = path.relative(STATIC_ROOT, filename);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function serveStatic(request, response, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { throw new DomainError('文件路径无效', 'INVALID_PATH'); }
  if (decoded.includes('\0') || decoded.includes('\\')) throw new DomainError('文件路径无效', 'INVALID_PATH');
  const filename = path.resolve(STATIC_ROOT, `.${decoded === '/' ? '/index.html' : decoded}`);
  if (!insideRoot(filename)) throw new DomainError('无法读取预览目录以外的文件', 'FORBIDDEN_PATH', 403);
  try {
    const resolved = await realpath(filename);
    if (!insideRoot(resolved)) throw new DomainError('无法读取预览目录以外的文件', 'FORBIDDEN_PATH', 403);
    const bytes = await readFile(resolved);
    response.writeHead(200, { 'content-type': CONTENT_TYPES[path.extname(filename).toLowerCase()] ?? 'application/octet-stream', 'content-length': bytes.length, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    if (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code)) throw new DomainError('没有找到该预览文件', 'NOT_FOUND', 404);
    throw error;
  }
}

export function createAppServer() {
  const rooms = new RoomStore();
  return http.createServer(async (request, response) => {
    try {
      const { pathname } = new URL(request.url, 'http://127.0.0.1');
      if (!pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(request.method)) throw new DomainError('此文件路径不支持该方法', 'METHOD_NOT_ALLOWED', 405);
        await serveStatic(request, response, pathname);
        return;
      }
      if (request.method === 'GET' && pathname === '/api/catalog') {
        json(response, 200, { destinations: DESTINATIONS, origins: ORIGINS, themes: THEMES, provinces: PROVINCES, presets: PRESETS, disclaimer: DISCLAIMER });
        return;
      }
      if (request.method === 'POST' && ['/api/candidates', '/api/draw', '/api/rooms'].includes(pathname)) {
        const clientId = requestIdentity(request);
        const body = await readJson(request);
        if (pathname === '/api/candidates') json(response, 200, candidatePool(body.filters));
        else if (pathname === '/api/draw') {
          const pool = candidatePool(body.filters);
          const destination = drawCandidate(pool.candidates);
          json(response, 200, { destination, poolSize: pool.candidates.length, candidateNames: pool.candidates.map(item => item.name), drawId: randomUUID(), createdAt: new Date().toISOString() });
        } else json(response, 201, rooms.create({ clientId, nickname: body.nickname, filters: body.filters }));
        return;
      }
      const route = pathname.match(/^\/api\/rooms\/([A-Za-z0-9_-]+)(?:\/(join|member|ready|draw|leave|next))?$/);
      if (route) {
        const [, code, action] = route;
        const clientId = requestIdentity(request);
        if (request.method === 'GET' && !action) json(response, 200, rooms.read(code, clientId));
        else if (request.method === 'POST' && action) {
          const body = await readJson(request);
          let room;
          if (action === 'join') room = rooms.join(code, { clientId, nickname: body.nickname, filters: body.filters });
          else if (action === 'member') room = rooms.update(code, { clientId, nickname: body.nickname, filters: body.filters, version: body.version });
          else if (action === 'leave') room = rooms.leave(code, clientId);
          else room = rooms[action](code, { clientId, version: body.version });
          json(response, 200, room);
        } else throw new DomainError('此房间路径不支持该方法', 'METHOD_NOT_ALLOWED', 405);
        return;
      }
      throw new DomainError('没有找到该接口', 'NOT_FOUND', 404);
    } catch (error) {
      if (response.headersSent) { response.destroy(); return; }
      if (error instanceof DomainError) json(response, error.status, { error: error.message, code: error.code });
      else { console.error(error); json(response, 500, { error: '预览服务遇到错误', code: 'INTERNAL_ERROR' }); }
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4177);
  createAppServer().listen(port, '127.0.0.1', () => console.log(`随性出发交互预览：http://127.0.0.1:${port}`));
}
