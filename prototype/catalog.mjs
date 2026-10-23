import citiesA from './data/hot-cities-a.json' with { type: 'json' };
import citiesB from './data/hot-cities-b.json' with { type: 'json' };
import citiesC from './data/hot-cities-c.json' with { type: 'json' };

export const THEMES = [
  { id: 'nature', label: '山海自然' },
  { id: 'urban', label: '城市烟火' },
  { id: 'culture', label: '历史人文' },
  { id: 'food', label: '美食探索' },
  { id: 'outdoor', label: '户外体验' },
  { id: 'slow', label: '安静度假' }
];
export const PRESETS = [
  { id: 'near', title: '轻松出去走走', subtitle: '附近逛逛，轻松又有趣', tags: ['短途地点', '轻松出发'], kind: 'spot', tier: 'light' },
  { id: 'explore', title: '想玩点不一样的', subtitle: '探索、尝鲜，给生活一点变化', tags: ['城市探索', '新鲜体验'], kind: 'city', tier: 'comfort' },
  { id: 'enjoy', title: '这次想好好享受', subtitle: '住得舒服，吃得讲究，享受一点浪漫', tags: ['品质度假', '自在停留'], kind: 'city', tier: 'premium' }
];

const cityGuides = [...citiesA, ...citiesB, ...citiesC];
const uniqueSources = sources => [...new Map(sources.map(source => [source.url, source])).values()];
function destination(guide, parent = guide) {
  const kind = guide === parent ? 'city' : 'spot';
  const sources = uniqueSources([...guide.sources, ...(kind === 'spot' ? parent.sources : [])]);
  return {
    id: guide.id, name: guide.name, province: parent.province, city: parent.name, cityId: parent.id, kind,
    coordinates: { ...guide.coordinates }, themes: [...guide.themes], tier: kind === 'city' ? guide.tier : 'light',
    art: guide.art, tagline: guide.highlights.slice(0, 2).join(' · '),
    description: guide.description, highlights: [...guide.highlights], foods: [...parent.foods], foodGuide: parent.foodGuide,
    seasons: guide.seasons || parent.seasons, climate: guide.climate || parent.climate,
    travel: guide.travel, localTransport: kind === 'city' ? guide.localTransport : parent.localTransport,
    days: guide.days, itinerary: guide.itinerary || [], tips: guide.tips,
    localBudget: null, sources, verifiedAt: parent.verifiedAt,
    sourceUrl: sources[0].url, sourceLabel: sources[0].label,
    dataNote: '根据列明来源整理；核对日期不代表实时状态。坐标用于地理直线距离筛选，非导航坐标。暂不提供未经核实的消费区间。'
  };
}
const cities = cityGuides.map(city => destination(city));
const spots = cityGuides.flatMap(city => city.spots.map(spot => destination(spot, city)));
export const DESTINATIONS = [...cities, ...spots];
export const ORIGINS = cities.map(({ id, name, coordinates }) => ({ id, name, coordinates: { ...coordinates } }));
export const PROVINCES = [...new Set(cities.map(item => item.province))];
export const DISCLAIMER = `已整理 ${cities.length} 座热门城市、${spots.length} 处代表景点，逐条列出资料来源和核对日期；尚未覆盖全国所有城市和景点。坐标与直线距离仅用于范围筛选，不能代替导航或交通耗时。没有接入实时天气、开放安排、票价、班次和余票；暂无可靠消费区间时不提供数值。`;
