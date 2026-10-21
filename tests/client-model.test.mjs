import test from 'node:test';
import assert from 'node:assert/strict';
import { presetFilters, parseCustomNames, toggleTheme, rememberDestination } from '../prototype/client-model.mjs';

test('near preset requires an origin and uses explicit distance in the preview', () => {
  const filters = presetFilters('near', {originId:'changsha',provinces:[],themeIds:[]}, []);
  assert.equal(filters.kind, 'spot');
  assert.equal(filters.originId, 'changsha');
  assert.equal(filters.maxDistanceKm, 120);
});

test('a nationwide preset does not silently discard a user-selected province or budget', () => {
  const filters = presetFilters('enjoy', {originId:'changsha',provinces:['湖南'],maxBudget:600,themeIds:['nature'],maxDistanceKm:40}, ['provinces','maxBudget','maxDistanceKm']);
  assert.deepEqual(filters.provinces, ['湖南']);
  assert.equal(filters.maxBudget, 600);
  assert.equal(filters.maxDistanceKm, 40);
  assert.deepEqual(filters.themeIds, ['nature']);
});

test('explore starts nationwide when region has not been deliberately constrained', () => {
  const filters = presetFilters('explore', {originId:'changsha',provinces:[],themeIds:[]}, []);
  assert.equal(filters.maxDistanceKm, null);
  assert.deepEqual(filters.provinces, []);
});

test('custom names accept newlines and Chinese separators, preserving one chance per name', () => {
  assert.deepEqual(parseCustomNames(' 长沙\n长沙；杭州, 我的秘密花园 '), ['长沙','杭州','我的秘密花园']);
});

test('theme toggling is optional and does not leave duplicates', () => {
  assert.deepEqual(toggleTheme(['nature'], 'nature'), []);
  assert.deepEqual(toggleTheme(['nature'], 'food'), ['nature','food']);
});

test('collecting the same destination twice does not duplicate the collection', () => {
  const city = {id:'hangzhou',name:'杭州'};
  assert.equal(rememberDestination([city], city).length, 1);
  assert.equal(rememberDestination([], city).length, 1);
});
