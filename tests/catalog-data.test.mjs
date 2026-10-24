import test from 'node:test';
import assert from 'node:assert/strict';
import { DESTINATIONS, ORIGINS } from '../prototype/catalog.mjs';
import { candidatePool } from '../prototype/domain.mjs';
import { RoomStore } from '../prototype/domain.mjs';
import baseline from './fixtures/catalog-original-180.json' with {type:'json'};
const cities = DESTINATIONS.filter(item => item.kind === 'city');

test('expanded coverage has at least 60 cities and ten independent places per city', () => {
  assert.ok(cities.length >= 60);
  assert.equal(new Set(cities.map(city=>city.name.trim().normalize('NFKC'))).size,cities.length);
  assert.ok(DESTINATIONS.filter(item=>item.kind==='spot').length >= 600);
  assert.equal(new Set(DESTINATIONS.map(item => item.id)).size, DESTINATIONS.length);
  for (const city of cities) {
    const spots = DESTINATIONS.filter(item => item.kind === 'spot' && item.cityId === city.id);
    assert.ok(spots.length >= 10, `${city.name}: ${spots.length}`);
    assert.equal(new Set(spots.map(spot=>spot.name.trim().normalize('NFKC'))).size,spots.length,city.name+' has distinct named places');
    assert.ok(candidatePool({preset:'near',originId:city.id}).candidates.length > 0, city.name+' has a reachable nearby option');
  }
  assert.equal(ORIGINS.length, cities.length);
});

test('published places contain traceable facts and never invented demonstration prices', () => {
  for (const item of DESTINATIONS) {
    assert.equal(item.localBudget, null, item.name);
    assert.ok(['2026-10-21','2026-10-23'].includes(item.verifiedAt), item.name);
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

test('expanded cities reach all 31 mainland provincial regions', () => {
  const expected=['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆'];
  assert.deepEqual([...new Set(cities.map(city=>city.province))].sort(),expected.sort());
});

test('all 180 previously published records retain their identities and original check dates', () => {
  for (const original of baseline) {
    const current=DESTINATIONS.find(item=>item.id===original.id);
    assert.ok(current,original.id);
    assert.equal(current.cityId,original.cityId,original.id);
    assert.equal(current.verifiedAt,original.verifiedAt,original.id);
  }
  for (const current of DESTINATIONS.filter(item=>!baseline.some(old=>old.id===item.id))) assert.equal(current.verifiedAt,'2026-10-23',current.name);
});

test('national spot rooms fit D1 row storage with room membership and a completed round', () => {
  const store=new RoomStore({randomIndex:()=>0});
  let room=store.create({clientId:'catalog-size-a',filters:{kind:'spot',maxDistanceKm:null}});
  room=store.join(room.inviteCode,{clientId:'catalog-size-b'});
  store.ready(room.inviteCode,{clientId:'catalog-size-a',version:room.version});
  store.ready(room.inviteCode,{clientId:'catalog-size-b',version:room.version});
  room=store.draw(room.inviteCode,{clientId:'catalog-size-a',version:room.version});
  const bytes=Buffer.byteLength(JSON.stringify(store.exportRecord(room.inviteCode)));
  assert.ok(bytes < 1_950_000,`serialized room is ${bytes} bytes`);
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
