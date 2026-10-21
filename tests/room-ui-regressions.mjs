import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createAppServer } from '../prototype/server.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const server = createAppServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
const results = [];
const failures = [];
const action = (p, name) => p.locator(`${name === 'close-modal' ? '.bottom-sheet ' : ''}[data-action="${name}"]`).first();
const screen = (p, value) => p.waitForFunction(v => document.body.dataset.screen === v, value, { timeout: 7000 });
const modal = (p, name) => p.locator(`[data-action="open-modal"][data-modal="${name}"]`).first().click();
const client = p => p.evaluate(() => JSON.parse(localStorage.getItem('roam-preview-v1')).clientId);
const bounded = promise => Promise.race([promise, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('HTTP interception timed out')), 7000); timer.unref(); })]);
async function request(p, code, route, body) {
  const response = await fetch(`${base}/api/rooms/${code}${route}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'x-travel-client': await client(p) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.ok(response.ok, await response.clone().text());
  return response.json();
}
async function page() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p = await context.newPage();
  await p.goto(base); await screen(p, 'home');
  return p;
}
async function create(p) {
  await p.locator('[data-action="set-mode"][data-id="group"]').click();
  await action(p, 'create-room').click(); await screen(p, 'room');
  return p.locator('[data-room-code]').getAttribute('data-room-code');
}
async function join(p, code) {
  await p.goto(`${base}/?room=${code}`);
  await p.waitForSelector('[data-field="inviteCode"]');
  await action(p, 'join-room').click(); await screen(p, 'room');
}
async function test(name, run) {
  try { await run(); results.push(name); console.log(`PASS ${name}`); }
  catch (error) { failures.push({ name, error: error.message }); console.log(`FAIL ${name}: ${error.message}`); }
}
// Obtain a real HTTP snapshot first, then control only its browser delivery.
async function hold(p, pattern, predicate = () => true, fetchOptions) {
  let captured;
  let release;
  const ready = new Promise(resolve => { captured = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  let held = false;
  let completed;
  const done = new Promise(resolve => { completed = resolve; });
  const handler = async route => {
    if (held || !predicate(route.request())) return route.continue();
    held = true;
    const response = await route.fetch(fetchOptions);
    captured(response);
    await gate;
    await route.fulfill({ response });
    completed();
  };
  await p.route(pattern, handler);
  return { ready: bounded(ready), release: async () => { release(); await bounded(done); await p.unroute(pattern, handler); } };
}
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  await test('delayed GET after leave cannot resurrect room', async () => {
    const p = await page(); const code = await create(p);
    const delayed = await hold(p, `**/api/rooms/${code}`, r => r.method() === 'GET');
    await delayed.ready;
    await action(p, 'leave-room').click(); await screen(p, 'home');
    await delayed.release();
    await p.waitForTimeout(350);
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('roam-preview-v1')).roomCode), '', 'left room remains cleared after old response');
    assert.equal(await p.locator('[data-action="set-mode"][data-id="solo"]').getAttribute('class'), 'mode-button active');
    await p.context().close();
  });
  await test('another member starts next round and old result stays history', async () => {
    const a = await page(); const b = await page(); const code = await create(a); await join(b, code);
    let room = await request(a, code, '');
    await request(a, code, '/ready', { version: room.version });
    await request(b, code, '/ready', { version: room.version });
    room = await request(b, code, '/draw', { version: room.version });
    await screen(a, 'result'); await screen(b, 'result');
    assert.match(await a.locator('.result-draw-label').innerText(), /第 1 轮/);
    await action(b, 'draw-again').click(); await screen(b, 'room'); await screen(a, 'room');
    assert.equal(await a.locator('[data-action="ready-room"]').isDisabled(), false);
    assert.equal(await a.locator('[data-testid="destination-name"]').count(), 0);
    assert.equal(await a.evaluate(() => JSON.parse(localStorage.getItem('roam-preview-v1')).history.length), 1);
    await a.context().close(); await b.context().close();
  });
  await test('stale success and failure cannot overwrite a new room session', async () => {
    for (const failure of [false, true]) {
      const p = await page(); const oldCode = await create(p);
      const delayed = await hold(p, `**/api/rooms/${oldCode}`, r => r.method() === 'GET', failure ? { headers: { 'x-travel-client': 'outsider' } } : undefined);
      const snapshot = await delayed.ready;
      assert.equal(snapshot.status(), failure ? 403 : 200);
      await action(p, 'leave-room').click(); await screen(p, 'home');
      const newCode = await create(p); assert.notEqual(newCode, oldCode);
      await delayed.release(); await p.waitForTimeout(250);
      assert.equal(await p.locator('[data-room-code]').getAttribute('data-room-code'), newCode);
      assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('roam-preview-v1')).roomCode), newCode);
      await p.context().close();
    }
  });
  await test('old same-version poll cannot regress newer readiness', async () => {
    const p = await page(); const code = await create(p);
    const delayed = await hold(p, `**/api/rooms/${code}`, r => r.method() === 'GET');
    await delayed.ready;
    await action(p, 'ready-room').click();
    await p.waitForFunction(() => document.querySelector('[data-action="ready-room"]')?.textContent.includes('我已准备好'));
    await delayed.release(); await p.waitForTimeout(250);
    assert.match(await action(p, 'ready-room').innerText(), /我已准备好/);
    await p.context().close();
  });
  await test('conflict retains draft, refreshes room and explicit reconfirm succeeds', async () => {
    const a = await page(); const b = await page(); const code = await create(a); await join(b, code);
    await a.waitForSelector('[data-member-id]:nth-child(2)');
    await modal(a, 'filters');
    await a.locator('[data-field="maxBudget"]').fill('900');
    await a.locator('[data-field="maxDistanceKm"]').fill('800');
    await a.locator('[data-field="preset"]').selectOption('enjoy');
    assert.equal(await a.locator('[data-field="maxBudget"]').inputValue(), '900', 'preset retains budget edited in this panel');
    assert.equal(await a.locator('[data-field="maxDistanceKm"]').inputValue(), '800', 'preset retains distance edited in this panel');
    await a.locator('[data-field="maxDistanceKm"]').fill('');
    const before = await request(a, code, '');
    await request(b, code, '/member', { version: before.version, filters: { ...before.members[1].filters, maxBudget: 1000 } });
    await action(a, 'apply-filters').click();
    await a.waitForSelector('.bottom-sheet [role="alert"]');
    assert.equal(await a.locator('[data-field="maxBudget"]').inputValue(), '900');
    let room = await request(a, code, '');
    assert.equal(room.members.find(m => m.id === before.members[0].id).filters.maxBudget, null, 'rejected draft is not applied');
    await action(a, 'apply-filters').click();
    await a.waitForSelector('.bottom-sheet', { state: 'detached' });
    room = await request(a, code, '');
    assert.equal(room.members.find(m => m.id === before.members[0].id).filters.maxBudget, 900);
    assert.ok(room.members.every(m => !m.ready), 'reconfirm does not automatically ready anyone');
    await a.context().close(); await b.context().close();
  });
  await test('double direct create is single flight and nearby checks origin', async () => {
    const p = await page();
    await p.locator('[data-action="set-mode"][data-id="group"]').click();
    let creates = 0;
    p.on('request', r => { if (r.url() === `${base}/api/rooms` && r.method() === 'POST') creates++; });
    const delayed = await hold(p, '**/api/rooms', r => r.method() === 'POST');
    // dispatch two real DOM clicks synchronously so the second precedes a server response.
    await p.locator('[data-action="create-room"]').evaluate(button => { button.click(); button.click(); });
    await delayed.ready; await p.waitForTimeout(200);
    await delayed.release(); await screen(p, 'room');
    assert.equal(creates, 1, 'one create HTTP request');
    await action(p, 'leave-room').click(); await screen(p, 'home');
    await p.locator('[data-action="set-mode"][data-id="group"]').click();
    await modal(p, 'filters'); await p.locator('[data-field="preset"]').selectOption('near');
    await action(p, 'apply-filters').click(); await p.waitForSelector('.bottom-sheet', { state: 'detached' });
    await action(p, 'create-room').click(); await p.waitForSelector('[data-field="originId"]');
    assert.equal(await p.locator('.bottom-sheet [data-field]').count(), 1);
    await p.context().close();
  });
  await test('full personal and room candidates plus exclusion reasons are reachable before draw', async () => {
    const p = await page();
    await p.locator('[data-action="select-preset"][data-id="explore"]').click(); await screen(p, 'game');
    await modal(p, 'candidates');
    const response = await fetch(`${base}/api/candidates`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-travel-client': await client(p) }, body: JSON.stringify({ filters: { preset: 'explore', kind: 'city' } }) });
    assert.ok(response.ok, await response.clone().text());
    const candidates = await response.json();
    assert.equal(await p.locator('.bottom-sheet [data-candidate-name]').count(), candidates.candidates.length);
    for (const item of candidates.candidates) assert.ok((await p.locator('.bottom-sheet').innerText()).includes(item.name));
    assert.match(await p.locator('.bottom-sheet').innerText(), /同样|等概率/);
    assert.equal(await p.locator('.bottom-sheet [data-rejected-name]').count(), candidates.rejected.length);
    await action(p, 'close-modal').click(); await p.locator('[data-action="go"][data-screen="home"]').first().click();
    const code = await create(p); const room = await request(p, code, '');
    await modal(p, 'candidates');
    assert.equal(await p.locator('.bottom-sheet [data-candidate-name]').count(), room.candidates.length);
    assert.ok(room.candidates.length > 8);
    assert.ok(await p.locator('.bottom-sheet [data-rejected-name]').count() > 0);
    assert.match(await p.locator('.bottom-sheet').innerText(), /旅行者.*目的地类型不符/s);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await p.context().close();
  });
  console.log(JSON.stringify({ passed: results.length, failed: failures.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
