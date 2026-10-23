import test from 'node:test';
import assert from 'node:assert/strict';
import { DESTINATIONS, ORIGINS } from '../prototype/catalog.mjs';
import { candidatePool } from '../prototype/domain.mjs';
const cities = DESTINATIONS.filter(item => item.kind === 'city');

test('popular coverage has 36 researched cities and four independent places per city', () => {
  assert.equal(cities.length, 36);
  assert.equal(DESTINATIONS.length, 180);
  assert.equal(new Set(DESTINATIONS.map(item => item.id)).size, DESTINATIONS.length);
  for (const city of cities) {
    const spots = DESTINATIONS.filter(item => item.kind === 'spot' && item.cityId === city.id);
    assert.equal(spots.length, 4, city.name);
    assert.ok(candidatePool({preset:'near',originId:city.id}).candidates.length > 0, city.name+' has a reachable nearby option');
  }
  assert.equal(ORIGINS.length, cities.length);
});

test('published places contain traceable facts and never invented demonstration prices', () => {
  for (const item of DESTINATIONS) {
    assert.equal(item.localBudget, null, item.name);
    assert.equal(item.verifiedAt, '2026-10-21', item.name);
    assert.ok(item.description.length >= 40, item.name+' description');
    assert.ok(item.travel.length >= 25, item.name+' transport');
    assert.ok(item.sources.length > 0, item.name+' sources');
    for (const source of item.sources) {
      assert.match(source.url, /^https?:\/\//);
      assert.ok(source.label);
      if (source.url.includes('wikivoyage.org')) { assert.equal(source.license, 'CC BY-SA 4.0'); assert.ok(source.attribution); }
    }
    assert.ok(item.coordinates.lat >= 18 && item.coordinates.lat <= 54, item.name);
    assert.ok(item.coordinates.lng >= 73 && item.coordinates.lng <= 135, item.name);
    assert.doesNotMatch(item.dataNote, /演示|示例/);
  }
});

test('city guides explain regional food and arrival rather than reusing a generic placeholder', () => {
  for (const city of cities) {
    assert.ok(city.foodGuide.length >= 3, city.name);
    assert.deepEqual(city.foodGuide.map(item => item.name), city.foods);
    assert.ok(city.foodGuide.every(item => item.description.length >= 15), city.name);
    assert.ok(city.localTransport.length >= 20, city.name);
    assert.ok(city.itinerary.length >= 2, city.name);
    assert.ok(city.tips.length >= 2, city.name);
    assert.doesNotMatch(city.travel, /^按出发地查询实际交通路线/);
  }
});

test('legacy city and nearby place identifiers remain valid for stored collections and rooms', () => {
  for (const id of ['changsha','beijing','hangzhou','chengdu','qingdao','xiamen','sanya','dali','lijiang','suzhou','zhuhai','shanghai','nanjing','wuhan','xian','chongqing','guilin','guangzhou','fuzhou','kunming','guiyang','huangshan','nanchang','zhengzhou','taiyuan','shenyang','harbin','lanzhou','juzizhou','yuelushan','jinggang-town','summer-palace','fragrant-hills','olympic-forest','west-lake','xixi','liangzhu-site','qingcheng','dujiangyan','huanglongxi']) assert.ok(DESTINATIONS.some(item => item.id === id), id);
});
