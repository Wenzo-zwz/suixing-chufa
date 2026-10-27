import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { presetFilters, parseCustomNames, toggleTheme, rememberDestination, refreshTravelRecords } from '../prototype/client-model.mjs';
import { localCandidatePool, localDraw, secureRandomUUID } from '../prototype/local-travel.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const builder = path.join(project, 'scripts/build-pages.mjs');
const avatar = 'assets/brand/suixing-chufa-avatar-v3-plane-rider.png';
const expectedFiles = ['.nojekyll', 'index.html', 'styles.css', 'app.mjs', 'render.mjs', 'client-model.mjs', 'candidate-core.mjs', 'local-travel.mjs', 'catalog.json', 'game-interactions.mjs', 'gesture-model.mjs', 'runtime-config.mjs', avatar].sort();
const appSource = await readFile(new URL('../prototype/app.mjs', import.meta.url), 'utf8');

async function filesIn(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await filesIn(path.join(directory, entry.name), name + '/'));
    else files.push(name);
  }
  return files.sort();
}

test('Pages export contains only static assets and overwrites stale server or secret files', async t => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'travel-pages-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const output = path.join(temporary, 'pages');
  await mkdir(output);
  await writeFile(path.join(output, '.env'), 'STALE_PRIVATE_VALUE');
  await writeFile(path.join(output, 'server.mjs'), 'private server implementation');
  const result = spawnSync(process.execPath, [builder, '--api-base', 'https://travel-api.example/', '--out-dir', output], { cwd: project, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(await filesIn(output), expectedFiles);
  const config = await import(pathToFileURL(path.join(output, 'runtime-config.mjs')).href);
  assert.deepEqual(config.default, { apiBase: 'https://travel-api.example' });
  const original = await readFile(path.join(project, 'assets/brand/suixing-chufa-avatar-v3-plane-rider.png'));
  assert.deepEqual(await readFile(path.join(output, avatar)), original);
  const homepage = await readFile(path.join(output, 'index.html'), 'utf8');
  for (const [, resource] of homepage.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = new URL(resource, 'https://wenzo-zwz.github.io/suixing-chufa/');
    assert.ok(url.pathname.startsWith('/suixing-chufa/'), `${resource} keeps the repository subpath`);
    assert.ok(expectedFiles.includes(decodeURIComponent(url.pathname.slice('/suixing-chufa/'.length))));
    if (/\/(app\.mjs|styles\.css)$/.test(url.pathname)) assert.match(url.search, /^\?v=[a-f0-9]+$/, 'changed releases bypass old mobile asset caches');
  }
});

test('Pages export rejects missing or non-origin HTTPS API configuration before changing output', async t => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'travel-pages-invalid-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const marker = path.join(temporary, 'keep.txt');
  await writeFile(marker, 'keep');
  for (const apiBase of ['', 'http://travel-api.example', 'https://name:password@travel-api.example', 'https://travel-api.example/api', 'https://travel-api.example/?token=secret', 'https://travel-api.example/#fragment']) {
    const args = apiBase ? ['--api-base', apiBase] : [];
    const result = spawnSync(process.execPath, [builder, ...args, '--out-dir', temporary], { cwd: project, encoding: 'utf8' });
    assert.notEqual(result.status, 0, `reject ${apiBase || 'missing API origin'}`);
    assert.match(result.stderr, /HTTPS API origin/);
    assert.equal(await readFile(marker, 'utf8'), 'keep');
  }
});

test('Pages export refuses to overwrite other source directories inside its project', async t => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'travel-pages-source-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  await mkdir(path.join(temporary, 'scripts'));
  await cp(builder, path.join(temporary, 'scripts/build-pages.mjs'));
  await cp(path.join(project, 'prototype'), path.join(temporary, 'prototype'), { recursive: true });
  await mkdir(path.join(temporary, 'app'));
  const marker = path.join(temporary, 'app', 'keep.mjs');
  await writeFile(marker, 'source must survive');
  const result = spawnSync(process.execPath, [path.join(temporary, 'scripts/build-pages.mjs'), '--api-base', 'https://travel-api.example', '--out-dir', path.join(temporary, 'app')], { encoding: 'utf8' });
  assert.notEqual(result.status, 0, 'a source directory cannot become the export target');
  assert.equal(await readFile(marker, 'utf8'), 'source must survive');
});

async function browserClient({ stored = {}, apiBase = 'https://travel-api.example', href = 'https://wenzo-zwz.github.io/suixing-chufa/?old=1#fragment' } = {}) {
  const storage = new Map([['roam-preview-v1', JSON.stringify(stored)]]);
  const requests = [], rendered = [], copied = [];
  const root = { innerHTML: '', querySelector: () => null, addEventListener: () => {} };
  let uuidIndex = 0;
  const uuids = ['12345678-1234-4123-8123-123456789abc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
  const context = vm.createContext({
    runtimeConfig: { apiBase }, presetFilters, parseCustomNames, toggleTheme, rememberDestination, refreshTravelRecords, localCandidatePool, localDraw, secureRandomUUID,
    renderApp: value => { rendered.push(value); return '<main>website</main>'; },
    mountGameInteractions: () => () => {},
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    crypto: { randomUUID: () => uuids[uuidIndex++ % uuids.length] },
    matchMedia: () => ({ matches: false }),
    document: { querySelector: () => root, body: { dataset: {} } },
    window: { addEventListener: () => {} }, location: new URL(href), URL, URLSearchParams, AbortController,
    navigator: { clipboard: { writeText: async text => copied.push(text) } },
    performance: { now: () => 0 }, setTimeout: () => 1, clearTimeout: () => {}, setInterval: () => 1, clearInterval: () => {}, console,
    fetch: async (url, options) => {
      requests.push({ url, ...options });
      return { ok: true, json: async () => String(url).endsWith('catalog.json') ? { destinations: [], presets: [{ id: 'explore', kind: 'city' }], origins: [], themes: [], provinces: [] } : { candidates: [] } };
    }
  });
  const executable = appSource.replace(/^import .*;\r?\n/gm, '').replace(/boot\(\);\s*$/, 'globalThis.bootPromise = boot();');
  vm.runInContext(executable, context, { filename: 'app.mjs' });
  await context.bootPromise;
  return { requests, rendered, copied, context, stored: () => JSON.parse(storage.get('roam-preview-v1')) };
}

test('browser persists a private token, sends it to the configured API and keeps it out of render state', async () => {
  const first = await browserClient({ stored: { clientId: 'existing-public-id' } });
  assert.match(first.stored().clientToken, /^[0-9a-f]{64}$/);
  assert.equal(first.stored().clientId, 'existing-public-id');
  assert.equal(first.requests.length, 1, 'personal startup fetches only its same-origin catalog');
  assert.equal(first.requests[0].url, './catalog.json');
  assert.equal(first.requests[0].headers, undefined, 'static catalog does not receive private credentials');
  await vm.runInContext("api('/api/rooms', {});", first.context);
  for (const request of first.requests.slice(1)) {
    assert.ok(request.url.startsWith('https://travel-api.example/api/'));
    assert.equal(request.headers['x-travel-token'], first.stored().clientToken);
    assert.equal(request.headers['x-travel-client'], 'existing-public-id');
  }
  assert.ok(first.rendered.length);
  assert.ok(first.rendered.every(state => !Object.hasOwn(state, 'clientToken')));
  const reloaded = await browserClient({ stored: first.stored(), apiBase: '' });
  assert.equal(reloaded.stored().clientToken, first.stored().clientToken);
  assert.equal(reloaded.requests[0].url, './catalog.json');
  await vm.runInContext("api('/api/rooms', {});", reloaded.context);
  assert.equal(reloaded.requests[1].url, '/api/rooms');
  assert.equal(reloaded.requests[1].headers['x-travel-token'], first.stored().clientToken);
});

test('invitations and ordinary shares keep the GitHub project path and clear stale query and fragment', async () => {
  const client = await browserClient();
  await vm.runInContext("state.room = {}; state.mode = 'group'; roomCode = 'ABC123'; share();", client.context);
  assert.ok(client.copied[0].endsWith('https://wenzo-zwz.github.io/suixing-chufa/?room=ABC123'));
  await vm.runInContext("state.room = null; state.mode = 'solo'; share();", client.context);
  assert.equal(client.copied[1], '一起随性出发：https://wenzo-zwz.github.io/suixing-chufa/');
});

test('website header uses the approved relative avatar and omits simulated phone and WeChat controls', async () => {
  const { renderApp } = await import('../prototype/render.mjs');
  const markup = renderApp({ screen: 'home', filters: presetFilters('explore'), catalog: {}, saved: [], journeys: [], history: [] });
  assert.ok(markup.includes(`src="./${avatar}"`));
  assert.doesNotMatch(markup, /phone-status|miniapp-capsule|9:41/);
  assert.match(markup, /class="app-header"/);
  const html = await readFile(new URL('../prototype/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes(`href="./${avatar}"`));
});
