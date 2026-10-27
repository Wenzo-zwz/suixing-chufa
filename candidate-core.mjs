export class DomainError extends Error {
  constructor(message, code = 'INVALID_DATA', status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function fail(message, code = 'INVALID_DATA', status = 400) {
  throw new DomainError(message, code, status);
}

export function stringList(value, field, maximum = 100) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maximum || value.some(item => typeof item !== 'string' || item.length > 100)) {
    fail(`${field}需要有效的文字列表，最多 ${maximum} 项；请删除或合并后重试`);
  }
  return [...new Set(value.map(item => item.trim().normalize('NFKC')).filter(Boolean))];
}

export const canonicalName = value => value.trim().normalize('NFKC');
export const destinationKey = item => `${item.kind}|${canonicalName(item.name)}|${item.province || ''}|${item.city || ''}`;

function distanceKm(left, right) {
  const radians = degrees => degrees * Math.PI / 180;
  const latitude = radians(right.lat - left.lat);
  const longitude = radians(right.lng - left.lng);
  const value = Math.sin(latitude / 2) ** 2 + Math.cos(radians(left.lat)) * Math.cos(radians(right.lat)) * Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function createCandidateEngine({ origins, presets, customId }) {
  function normalizeFilters(input = {}, customNameMaximum = 100) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('筛选条件需要是对象');
    const preset = input.preset ?? 'explore';
    const presetItem = presets.find(item => item.id === preset);
    if (!presetItem) fail('请选择有效的出发意图');
    const kind = input.kind ?? presetItem.kind;
    if (!['city', 'spot'].includes(kind)) fail('目的地类型无效');
    const originId = input.originId ?? '';
    if (typeof originId !== 'string' || (originId && !origins.some(item => item.id === originId))) fail('请选择目录中的出发城市');
    for (const field of ['maxDistanceKm', 'maxBudget']) {
      const value = input[field];
      if (value !== undefined && value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (field === 'maxDistanceKm' && value === 0))) {
        fail(`${field === 'maxDistanceKm' ? '距离' : '当地消费上限'}需要有效的非负数值`);
      }
    }
    return {
      preset, originId,
      provinces: stringList(input.provinces, '地区'),
      themeIds: stringList(input.themeIds, '主题'),
      kind,
      maxDistanceKm: input.maxDistanceKm === undefined ? (preset === 'near' ? 120 : null) : input.maxDistanceKm,
      maxBudget: input.maxBudget ?? null,
      customNames: stringList(input.customNames, '自填目的地', customNameMaximum),
      excludedIds: stringList(input.excludedIds, '排除名单', 200)
    };
  }

  function customDestination(name) {
    return {
      id: customId(name),
      name, province: '', city: '', kind: 'city', coordinates: null, themes: [], tier: 'flexible',
      tagline: '你的自填目的地',
      description: '这是你自填的目的地，尚未核实地点、出行条件和当地资料。出发前请自行查询。',
      highlights: [], foods: [], seasons: [],
      climate: '暂无核实资料，天气请查询实时服务。',
      travel: '暂无核实资料，交通、耗时和班次需自行查询。',
      days: '停留时间由你决定', localBudget: null, art: 'city', sourceUrl: '', sourceLabel: '',
      dataNote: '自定义名单 · 未核实目的地资料；不提供虚构天气、价格或交通信息。'
    };
  }

  function candidatePool(input = {}, catalog = []) {
    return filteredPool(normalizeFilters(input), catalog);
  }

  function filteredPool(filters, catalog) {
    const nearby = filters.maxDistanceKm !== null;
    const radius = filters.maxDistanceKm;
    const origin = origins.find(item => item.id === filters.originId);
    if (nearby && !origin) return { candidates: [], rejected: [], needsOrigin: true, note: '请先选择出发城市，附近按地理直线距离筛选，不代表实时交通耗时。' };
    const source = filters.customNames.length
      ? filters.customNames.map(name => catalog.find(item => canonicalName(item.name) === name) ?? customDestination(name))
      : catalog;
    const seenIds = new Set();
    const seenPlaces = new Set();
    const candidates = [];
    const rejected = [];
    for (const item of source) {
      const key = destinationKey(item);
      if (seenIds.has(item.id) || seenPlaces.has(key)) continue;
      seenIds.add(item.id);
      seenPlaces.add(key);
      let reason = '';
      if (filters.excludedIds.includes(item.id)) reason = '已排除';
      else if (!filters.customNames.length && item.kind !== filters.kind) reason = '目的地类型不符';
      else if (filters.provinces.length && !filters.provinces.includes(item.province)) reason = '不在所选地区';
      else if (filters.themeIds.length && !filters.themeIds.some(theme => item.themes.includes(theme))) reason = '暂无符合所选主题的资料';
      else if (!filters.customNames.length && filters.preset === 'enjoy' && item.tier !== 'premium') reason = '不属于此体验意图的候选';
      else if (filters.maxBudget !== null && (!item.localBudget || item.localBudget.max > filters.maxBudget)) reason = (!item.localBudget ? '暂无可靠消费区间，无法按预算筛选' : '当地消费参考上限超出');
      else if (nearby && (!item.coordinates || distanceKm(origin.coordinates, item.coordinates) > radius)) reason = '超出地理距离范围或坐标未知';
      if (reason) rejected.push({ name: item.name, reason });
      else candidates.push(item);
    }
    return {
      candidates, rejected, needsOrigin: false,
      note: nearby
        ? `已收录景点 · 出发城市周边 ${radius} 公里地理直线距离筛选；不等于实时耗时，也不承诺当天往返。范围内未收录的地点不会参与抽取。`
        : '当前为有来源的热门目的地资料，并非全国全量目录；费用未知时不能按预算筛选，天气、班次、票价与余票需另行实时查询。'
    };
  }

  return { normalizeFilters, candidatePool, filteredPool };
}

export function drawCandidate(candidates, randomIndex) {
  if (!Array.isArray(candidates) || candidates.length === 0) fail('没有可抽取的候选，请微调条件', 'NO_CANDIDATES', 409);
  const index = randomIndex(candidates.length);
  if (!Number.isInteger(index) || index < 0 || index >= candidates.length) throw new RangeError('随机索引超出候选范围');
  return candidates[index];
}

