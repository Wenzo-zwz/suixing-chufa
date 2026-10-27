import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { candidatePool, drawCandidate, DomainError } from '../prototype/domain.mjs';
import { DESTINATIONS, ORIGINS, THEMES, PROVINCES, PRESETS, DISCLAIMER } from '../prototype/catalog.mjs';
import { createAppServer } from '../prototype/server.mjs';
import { buildPages } from '../scripts/build-pages.mjs';

const catalog = { destinations: DESTINATIONS, origins: ORIGINS, themes: THEMES, provinces: PROVINCES, presets: PRESETS, disclaimer: DISCLAIMER };
async function local() {
  const loaded = await import('../prototype/local-travel.mjs').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
    throw error;
  });
  assert.ok(loaded, 'browser local travel module must exist');
  return loaded;
}

test('local pools preserve complete server candidates and rejection reasons for all filters', async () => {
  const { localCandidatePool } = await local();
  const duplicateCatalog = { ...catalog, destinations: [...DESTINATIONS, { ...DESTINATIONS[0], id: 'duplicate-copy' }] };
  for (const filters of [
    {}, { preset: 'near' }, { preset: 'near', originId: 'changsha' },
    { provinces: ['浙江'] }, { themeIds: ['food', 'culture'] },
    { preset: 'enjoy' }, { maxBudget: 300 },
    { excludedIds: [DESTINATIONS[0].id] },
    { customNames: ['长沙', ' 长沙 ', '杭州', '我的秘密基地', 'ＡＢＣ基地'] },
    { customNames: ['我的秘密基地'], maxBudget: 300 },
    { customNames: ['长沙', '杭州'], provinces: ['湖南'], themeIds: ['food'] }
  ]) {
    assert.deepEqual(await localCandidatePool(filters, duplicateCatalog), candidatePool(filters, duplicateCatalog.destinations), JSON.stringify(filters));
  }
});

test('local unknown custom IDs exactly retain legacy SHA256 identities and exclusions', async () => {
  const { localCandidatePool } = await local();
  const name = '我的秘密基地';
  const id = `custom-${createHash('sha256').update(name).digest('hex').slice(0, 16)}`;
  const pool = await localCandidatePool({ customNames: [name, ` ${name} `] }, catalog);
  assert.deepEqual(pool.candidates.map(item => item.id), [id]);
  assert.deepEqual(await localCandidatePool({ customNames: [name], excludedIds: [id] }, catalog), candidatePool({ customNames: [name], excludedIds: [id] }));
});

test('local invalid filters and empty draw preserve server errors', async () => {
  const { localCandidatePool, localDraw } = await local();
  for (const filters of [null, [], { kind: 'hotel' }, { maxBudget: -1 }, { originId: 'unknown' }, { themeIds: 'food' }]) {
    let expected;
    try { candidatePool(filters); } catch (error) { expected = error; }
    await assert.rejects(localCandidatePool(filters, catalog), error => error instanceof DomainError && error.message === expected.message && error.code === expected.code && error.status === expected.status);
  }
  let expected;
  try { drawCandidate([]); } catch (error) { expected = error; }
  await assert.rejects(localDraw({ provinces: ['不存在地区'] }, catalog), error => error instanceof DomainError && error.message === expected.message && error.code === expected.code && error.status === expected.status);
});

test('secure index rejection sampling rejects the biased tail and includes both boundaries', async () => {
  const { secureRandomIndex } = await local();
  const values = [0xffffffff, 0xfffffffe, 0];
  let calls = 0;
  const crypto = { getRandomValues(array) { calls++; array[0] = values.shift(); return array; } };
  assert.equal(secureRandomIndex(3, crypto), 2);
  assert.equal(calls, 2);
  assert.equal(secureRandomIndex(3, crypto), 0);
  assert.equal(secureRandomIndex(1, { getRandomValues(array) { array[0] = 0xffffffff; return array; } }), 0);
  assert.equal(secureRandomIndex(2 ** 32, { getRandomValues(array) { array[0] = 0xffffffff; return array; } }), 0xffffffff);
  for (const length of [0, -1, 1.5, 2 ** 32 + 1]) assert.throws(() => secureRandomIndex(length, crypto), RangeError);
  assert.throws(() => secureRandomIndex(2, {}), error => error.code === 'SECURE_RANDOM_UNAVAILABLE');
});

test('local draws expose the solo protocol and secure UUID fallback uses correct RFC bits', async () => {
  const { localDraw, secureRandomUUID } = await local();
  const result = await localDraw({ customNames: ['长沙', '长沙', '杭州'] }, catalog, { randomUUID: () => 'provided-draw-id' });
  assert.deepEqual(Object.keys(result).sort(), ['destination', 'poolSize', 'candidateNames', 'drawId', 'createdAt'].sort());
  assert.equal(result.poolSize, 2);
  assert.deepEqual(result.candidateNames, ['长沙', '杭州']);
  assert.ok(result.candidateNames.includes(result.destination.name));
  assert.equal(result.drawId, 'provided-draw-id');
  assert.ok(Number.isFinite(Date.parse(result.createdAt)));
  assert.equal(secureRandomUUID({ randomUUID: () => 'native-id' }), 'native-id');
  assert.equal(secureRandomUUID({ getRandomValues(array) { array.fill(255); return array; } }), 'ffffffff-ffff-4fff-bfff-ffffffffffff');
});

test('preview serves same public catalog at same-origin GET and HEAD without caching', async t => {
  const server = createAppServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(base + '/catalog.json');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), await (await fetch(base + '/api/catalog')).json());
  const head = await fetch(base + '/catalog.json', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('Pages bundles public catalog and browser-safe shared rules from the same source', async t => {
  const output = await mkdtemp(path.join(os.tmpdir(), 'travel-local-pages-'));
  t.after(() => rm(output, { recursive: true, force: true }));
  await buildPages({ apiBase: 'https://example.com', outputDir: output });
  assert.deepEqual(JSON.parse(await readFile(path.join(output, 'catalog.json'), 'utf8')), catalog);
  for (const file of ['candidate-core.mjs', 'local-travel.mjs']) {
    const source = await readFile(path.join(output, file), 'utf8');
    assert.doesNotMatch(source, /node:|catalog\.mjs|hot-cities|Math\.random/);
  }
});
