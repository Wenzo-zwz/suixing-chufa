import test from 'node:test';
import assert from 'node:assert/strict';
import { candidatePool } from '../prototype/domain.mjs';

test('clearing a shortcut distance limit really restores an unrestricted geographic pool', () => {
  const pool = candidatePool({preset:'near',kind:'spot',maxDistanceKm:null,originId:''});
  assert.equal(pool.needsOrigin, false);
  assert.ok(pool.candidates.length > 0);
});
