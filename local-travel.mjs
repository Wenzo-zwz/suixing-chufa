import { canonicalName, createCandidateEngine, DomainError, drawCandidate } from './candidate-core.mjs?v=e4921c07905c';

function secureCrypto(crypto = globalThis.crypto) {
  if (typeof crypto?.getRandomValues !== 'function') {
    throw new DomainError('当前浏览器暂不支持安全随机数，请更新浏览器后重试', 'SECURE_RANDOM_UNAVAILABLE', 503);
  }
  return crypto;
}

export function secureRandomIndex(length, crypto = globalThis.crypto) {
  if (!Number.isInteger(length) || length < 1 || length > 2 ** 32) throw new RangeError('随机索引需要有效候选数量');
  const source = secureCrypto(crypto);
  // Discard the incomplete final bucket before reducing to an equal-sized pool.
  const limit = Math.floor(2 ** 32 / length) * length;
  const value = new Uint32Array(1);
  do { source.getRandomValues(value); } while (value[0] >= limit);
  return value[0] % length;
}

export function secureRandomUUID(crypto = globalThis.crypto) {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  const bytes = secureCrypto(crypto).getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function localCandidatePool(filters, catalog) {
  const ids = new Map();
  const engine = createCandidateEngine({
    origins: catalog.origins,
    presets: catalog.presets,
    customId: name => ids.get(name)
  });
  const normalized = engine.normalizeFilters(filters);
  const unknownNames = normalized.customNames.filter(name => !catalog.destinations.some(item => canonicalName(item.name) === name));
  if (unknownNames.length && typeof globalThis.crypto?.subtle?.digest !== 'function') {
    throw new DomainError('当前浏览器暂不支持自填目的地，请更新浏览器后重试', 'SECURE_HASH_UNAVAILABLE', 503);
  }
  await Promise.all(unknownNames.map(async name => {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(name));
    const hex = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
    ids.set(name, `custom-${hex.slice(0, 16)}`);
  }));
  return engine.filteredPool(normalized, catalog.destinations);
}

export async function localDraw(filters, catalog, { randomUUID = secureRandomUUID } = {}) {
  const pool = await localCandidatePool(filters, catalog);
  const destination = drawCandidate(pool.candidates, secureRandomIndex);
  return {
    destination, poolSize: pool.candidates.length, candidateNames: pool.candidates.map(item => item.name),
    drawId: randomUUID(), createdAt: new Date().toISOString()
  };
}
