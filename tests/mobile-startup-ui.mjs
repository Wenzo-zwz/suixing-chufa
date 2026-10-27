import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createAppServer } from '../prototype/server.mjs';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const server = createAppServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const results = [];
const home = page => page.waitForFunction(() => document.body.dataset.screen === 'home', null, { timeout: 1800 });
const startupError = page => page.locator('[data-action="retry-boot"]').waitFor({ timeout: 1800 });
const shortenApiTimeout = () => {
  const schedule = window.setTimeout;
  window.setTimeout = (callback, delay, ...args) => schedule(callback, delay === 20000 ? 150 : delay, ...args);
};

async function scenario(name, run) {
  if (process.argv[2] && !name.includes(process.argv[2])) return;
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  page.setDefaultTimeout(1800);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await run(page, context, errors);
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.message, pageErrors: errors });
  } finally {
    await context.close();
  }
}

try {
  await scenario('saved room restore never blocks solo and keeps unreachable room code', async (page, context) => {
    await context.addInitScript(shortenApiTimeout);
    await context.addInitScript(() => localStorage.setItem('roam-preview-v1', JSON.stringify({ roomCode: 'ABC123' })));
    await page.route('**/api/rooms/**', () => {});
    await page.goto(base);
    await page.waitForFunction(() => document.body.dataset.screen === 'home', null, { timeout: 200 });
    await page.locator('[data-action="select-preset"][data-id="explore"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'game');
    await page.locator('[data-action="launch"]').first().click();
    await page.locator('[data-action="skip-animation"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'result');
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('roam-preview-v1')).roomCode), 'ABC123', 'a network failure preserves the saved room for a later reconnect');
  });

  await scenario('late successful restore cannot replace a newly started solo game', async (page, context) => {
    const host = '12345678-1234-4123-8123-123456789abc';
    const guest = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const command = async (path, clientId, body) => {
      const response = await fetch(`${base}${path}`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-travel-client': clientId }, body: JSON.stringify(body)
      });
      assert.ok(response.ok, `the real local room command succeeds: ${path}`);
      return response.json();
    };
    let room = await command('/api/rooms', host, { nickname: '恢复测试', filters: { preset: 'explore' } });
    const path = `/api/rooms/${room.inviteCode}`;
    room = await command(`${path}/join`, guest, { nickname: '队友' });
    room = await command(`${path}/ready`, host, { version: room.version });
    room = await command(`${path}/ready`, guest, { version: room.version });
    room = await command(`${path}/draw`, host, { version: room.version });
    assert.equal(room.phase, 'drawn');
    await context.addInitScript(value => localStorage.setItem('roam-preview-v1', JSON.stringify(value)), {
      clientId: host, clientToken: 'a'.repeat(64), roomCode: room.inviteCode
    });
    let restoreRoute;
    await page.route(`**${path}`, route => { restoreRoute = route; });
    await page.goto(base);
    await home(page);
    await page.locator('[data-action="select-preset"][data-id="explore"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'game');
    assert.ok(restoreRoute, 'a saved room restore was attempted in the background');
    const restored = page.waitForResponse(response => new URL(response.url()).pathname === path);
    await restoreRoute.fulfill({ json: room });
    await restored;
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(() => document.body.dataset.screen), 'game');
    assert.equal(await page.locator('[data-testid="destination-name"]').count(), 0, 'a stale group result never replaces the solo game');
    await page.unroute(`**${path}`);
    await page.reload();
    await page.waitForFunction(() => document.body.dataset.screen === 'result');
    assert.equal((await page.locator('[data-testid="destination-name"]').first().innerText()).trim(), room.destination.name);
    const history = await page.evaluate(() => JSON.parse(localStorage.getItem('roam-preview-v1')).history);
    assert.ok(history.some(item => item.drawId === `room-${room.inviteCode}-${room.round}` && item.destination.id === room.destination.id), 'an idle reload restores the actual saved group result and records its draw identity');
  });

  await scenario('solo selection works with cloud blocked and sends no API requests', async page => {
    let apiRequests = 0;
    await page.route('**/api/**', route => { apiRequests++; return route.abort('failed'); });
    await page.goto(base);
    await home(page);
    assert.equal(await page.locator('[data-action="select-preset"]').count(), 3);
    await page.locator('[data-action="select-preset"][data-id="explore"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'game');
    await page.locator('[data-action="launch"]').first().click();
    await page.locator('[data-action="skip-animation"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'result');
    assert.ok((await page.locator('[data-testid="destination-name"]').first().innerText()).trim());
    assert.equal(apiRequests, 0, 'opening and using solo mode never attempts the cloud API');
  });

  await scenario('secure identity works without randomUUID or replaceAll', async (page, context, errors) => {
    await context.addInitScript(() => {
      Object.defineProperty(crypto, 'randomUUID', { value: undefined });
      Object.defineProperty(String.prototype, 'replaceAll', { value: undefined });
    });
    await page.goto(base);
    await home(page);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('roam-preview-v1')));
    assert.match(saved.clientToken, /^[0-9a-f]{64}$/);
    assert.match(saved.clientId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.deepEqual(errors, []);
  });

  await scenario('existing credentials survive compatibility fallback', async (page, context) => {
    const credentials = { clientId: '12345678-1234-4123-8123-123456789abc', clientToken: 'a'.repeat(64) };
    await context.addInitScript(value => {
      localStorage.setItem('roam-preview-v1', JSON.stringify(value));
      Object.defineProperty(crypto, 'randomUUID', { value: undefined });
      Object.defineProperty(String.prototype, 'replaceAll', { value: undefined });
    }, credentials);
    await page.goto(base);
    await home(page);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('roam-preview-v1')));
    assert.equal(saved.clientId, credentials.clientId);
    assert.equal(saved.clientToken, credentials.clientToken);
  });

  await scenario('blocked storage keeps working with visible session notice', async (page, context, errors) => {
    await context.addInitScript(() => Object.defineProperty(Storage.prototype, 'setItem', {
      value() { throw new DOMException('Storage disabled', 'SecurityError'); }
    }));
    await page.goto(base);
    await home(page);
    const text = await page.locator('#app').innerText();
    assert.match(text, /本次/);
    assert.match(text, /收藏/);
    assert.match(text, /身份/);
    await page.locator('[data-action="select-preset"][data-id="explore"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'game');
    assert.deepEqual(errors, []);
  });

  await scenario('failed catalog offers manual retry without automatic retries', async page => {
    let calls = 0;
    await page.route('**/catalog.json', route => { calls++; return route.abort('failed'); });
    await page.goto(base);
    await startupError(page);
    assert.equal(calls, 1);
    await page.unroute('**/catalog.json');
    await page.locator('[data-action="retry-boot"]').click();
    await home(page);
  });

  await scenario('malformed catalog offers recovery without an uncaught TypeError', async (page, context, errors) => {
    const consoleErrors = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await page.route('**/catalog.json', route => route.fulfill({
      contentType: 'application/json', body: JSON.stringify({ destinations: null })
    }));
    await page.goto(base);
    await startupError(page);
    assert.deepEqual(errors, [], 'invalid catalog data becomes a recoverable startup error');
    assert.doesNotMatch(consoleErrors.join('\n'), /TypeError/, 'catalog shape is checked before it reaches array operations');
    await page.unroute('**/catalog.json');
    await page.locator('[data-action="retry-boot"]').click();
    await home(page);
  });

  await scenario('stalled same-origin catalog times out and can retry', async (page, context) => {
    await context.addInitScript(shortenApiTimeout);
    await page.route('**/catalog.json', () => {});
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await startupError(page);
    assert.match(await page.locator('#app').innerText(), /超时|太久/);
    await page.unroute('**/catalog.json');
    await page.locator('[data-action="retry-boot"]').click();
    await home(page);
  });

  await scenario('stalled room request times out while solo remains available', async (page, context) => {
    await context.addInitScript(shortenApiTimeout);
    let requests = 0;
    await page.route('**/api/rooms', () => { requests++; });
    await page.goto(base);
    await home(page);
    await page.locator('[data-action="set-mode"][data-id="group"]').click();
    await page.locator('[data-action="select-preset"][data-id="explore"]').click();
    await page.locator('.error-banner').first().waitFor();
    const text = await page.locator('#app').innerText();
    assert.match(text, /超时|太久/);
    assert.match(text, /个人出发仍可继续/);
    assert.equal(requests, 1, 'a timed-out room POST is never retried automatically');
    await page.locator('[data-action="set-mode"][data-id="solo"]').click();
    await page.locator('[data-action="select-preset"][data-id="explore"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'game');
    assert.equal(requests, 1);
  });

  await scenario('unsettled response body is included in API deadline', async (page, context) => {
    await context.addInitScript(shortenApiTimeout);
    await context.addInitScript(() => {
      const request = window.fetch.bind(window);
      let first = true;
      window.fetch = async (...args) => {
        const response = await request(...args);
        if (first && String(args[0]).includes('catalog.json')) {
          first = false;
          response.json = () => new Promise(() => {});
        }
        return response;
      };
    });
    await page.goto(base);
    await startupError(page);
    await page.locator('[data-action="retry-boot"]').click();
    await home(page);
  });

  for (const module of ['app.mjs', 'render.mjs']) {
    await scenario(`failed ${module} shows recovery and preserves invitation`, async page => {
      await page.route(`**/${module}`, route => route.abort('failed'));
      await page.goto(`${base}/?room=AB12&note=%3Cscript%3E`);
      const retry = page.locator('[data-startup-retry]');
      await retry.waitFor();
      const backup = page.locator('[data-startup-backup]');
      const url = new URL(await backup.getAttribute('href'));
      assert.equal(url.origin, 'https://suixing-chufa-cloud.pastelchick11.chatgpt.site');
      assert.equal(url.pathname, '/web/');
      assert.equal(url.searchParams.get('room'), 'AB12');
      assert.equal(await page.locator('#app script').count(), 0, 'query text is never inserted as HTML');
      await page.unroute(`**/${module}`);
      await retry.click();
      await page.locator('[data-field="inviteCode"]').waitFor();
      assert.equal(await page.locator('[data-field="inviteCode"]').inputValue(), 'AB12');
    });
  }

  await scenario('stalled module has bounded recovery and reloads successfully', async (page, context) => {
    await context.addInitScript(() => {
      const schedule = window.setTimeout;
      window.setTimeout = (callback, delay, ...args) => schedule(callback, delay === 15000 ? 150 : delay, ...args);
    });
    let stalled = true;
    let moduleRequests = 0;
    await page.route('**/app.mjs', route => {
      moduleRequests++;
      if (!stalled) return route.continue();
    });
    await page.goto(base, { waitUntil: 'commit' });
    await page.locator('[data-startup-retry]').waitFor();
    // Keep the first request stalled: removing its handler would resume it and
    // replace the recovery button before a real reload could be exercised.
    stalled = false;
    await page.locator('[data-startup-retry]').click({ noWaitAfter: true });
    await home(page);
    assert.equal(moduleRequests, 2, 'the recovery click requests the module in a new document');
  });

  await scenario('cloud fallback never sends visitors back to itself', async page => {
    const cloud = 'https://suixing-chufa-cloud.pastelchick11.chatgpt.site';
    await page.route(`${cloud}/**`, async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/app.mjs')) return route.abort('failed');
      const response = await route.fetch({ url: base + (url.pathname.replace(/^\/web/, '') || '/') });
      await route.fulfill({ response });
    });
    await page.goto(`${cloud}/web/?room=AB12`);
    await page.locator('[data-startup-retry]').waitFor();
    assert.equal(await page.locator('[data-startup-backup]').isVisible(), false);
  });

  await scenario('loaded module waiting for catalog is not reported as module failure', async (page, context) => {
    await context.addInitScript(() => {
      const schedule = window.setTimeout;
      window.setTimeout = (callback, delay, ...args) => schedule(callback, delay >= 5000 && delay !== 20000 ? 150 : delay, ...args);
    });
    await page.route('**/catalog.json', async route => {
      await new Promise(resolve => setTimeout(resolve, 400));
      await route.continue();
    });
    await page.goto(base);
    await home(page);
    assert.equal(await page.locator('[data-startup-retry]').count(), 0);
  });
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}

for (const result of results) console.log(JSON.stringify(result));
console.log(`${results.filter(result => result.status === 'PASS').length}/${results.length} startup scenarios passed`);
if (results.some(result => result.status === 'FAIL')) process.exitCode = 1;
