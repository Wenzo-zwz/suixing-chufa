// 有限的交互演示目录；静态介绍采用常识，预算不表示真实报价。
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

// id / 名称 / 省级地区 / 纬度 / 经度 / 主题 / 消费档 / 画面 / 简介 / 看点 / 食物
const cityRows = [
  ['changsha', '长沙', '湖南', 28.2282, 112.9388, ['food', 'urban', 'culture'], 'comfort', 'city', '沿湘江走一走，再去街巷里寻找热闹的湘味。', ['湘江风光', '岳麓书院', '街巷夜色'], ['臭豆腐', '米粉', '糖油粑粑']],
  ['beijing', '北京', '北京', 39.9042, 116.4074, ['culture', 'urban', 'food'], 'comfort', 'city', '从古建筑与胡同出发，感受一座大城的日常。', ['故宫周边', '胡同漫步', '中轴线'], ['北京烤鸭', '炸酱面']],
  ['hangzhou', '杭州', '浙江', 30.2741, 120.1551, ['nature', 'slow', 'culture'], 'premium', 'garden', '湖岸、茶山与街巷，让停留的节奏慢下来。', ['西湖', '龙井茶文化', '运河街区'], ['葱包桧', '片儿川']],
  ['chengdu', '成都', '四川', 30.5728, 104.0668, ['food', 'urban', 'slow'], 'premium', 'city', '在茶馆坐一会儿，把一天交给街头和川味。', ['茶馆生活', '宽窄巷子', '锦里街区'], ['担担面', '钟水饺', '火锅']],
  ['qingdao', '青岛', '山东', 36.0671, 120.3826, ['nature', 'urban', 'slow'], 'premium', 'coast', '沿海岸散步，在坡道和老建筑之间寻找城市风景。', ['海岸步道', '八大关', '老城街区'], ['鲅鱼水饺', '海鲜']],
  ['xiamen', '厦门', '福建', 24.4798, 118.0894, ['nature', 'culture', 'slow'], 'premium', 'coast', '海风、骑楼与岛屿，适合留出一段漫步时间。', ['环岛路', '鼓浪屿', '骑楼街巷'], ['沙茶面', '海蛎煎']],
  ['sanya', '三亚', '海南', 18.2528, 109.5119, ['nature', 'slow', 'outdoor'], 'premium', 'coast', '把海湾与椰树作为背景，安排一段从容的海边假期。', ['海湾景观', '海边漫步', '椰林'], ['海南粉', '椰子鸡']],
  ['dali', '大理', '云南', 25.6065, 100.2676, ['nature', 'culture', 'slow'], 'premium', 'mountain', '苍山与洱海之间，古城街巷连着开阔的山水。', ['苍山', '洱海', '大理古城'], ['饵丝', '乳扇']],
  ['lijiang', '丽江', '云南', 26.8721, 100.2299, ['nature', 'culture', 'slow'], 'premium', 'town', '在古城水巷停留，远处的山景为旅途添一层轮廓。', ['古城水巷', '纳西文化', '山景'], ['鸡豆凉粉', '纳西烤鱼']],
  ['suzhou', '苏州', '江苏', 31.2989, 120.5853, ['culture', 'slow', 'nature'], 'premium', 'garden', '园林与水巷相邻，适合慢慢看细节。', ['古典园林', '平江路', '水巷'], ['苏式汤面', '苏式糕点']],
  ['zhuhai', '珠海', '广东', 22.2707, 113.5767, ['nature', 'slow', 'urban'], 'premium', 'coast', '沿城市海岸步行，让海风成为旅程的一部分。', ['情侣路', '城市海岸', '海湾景观'], ['广式点心', '海鲜']],
  ['shanghai', '上海', '上海', 31.2304, 121.4737, ['urban', 'culture', 'food'], 'comfort', 'city', '沿江看建筑，再转进街区感受城市生活。', ['外滩', '梧桐街区', '黄浦江'], ['生煎', '小笼包']],
  ['nanjing', '南京', '江苏', 32.0603, 118.7969, ['culture', 'urban', 'food'], 'comfort', 'city', '城墙、秦淮河与街巷，把历史和日常连在一起。', ['明城墙', '秦淮河', '老城街巷'], ['盐水鸭', '鸭血粉丝汤']],
  ['wuhan', '武汉', '湖北', 30.5928, 114.3055, ['urban', 'food', 'culture'], 'comfort', 'city', '从江岸到湖边，体验长江城市的街头节奏。', ['长江江岸', '东湖', '江汉路'], ['热干面', '豆皮']],
  ['xian', '西安', '陕西', 34.3416, 108.9398, ['culture', 'food', 'urban'], 'comfort', 'city', '在城墙内外散步，让古都的街巷成为旅行线索。', ['城墙', '钟鼓楼周边', '历史街区'], ['肉夹馍', '羊肉泡馍']],
  ['chongqing', '重庆', '重庆', 29.5630, 106.5516, ['urban', 'food', 'culture'], 'comfort', 'city', '在坡道、江岸与桥梁之间发现山城的层次。', ['两江交汇', '山城步道', '江岸夜景'], ['重庆小面', '火锅']],
  ['guilin', '桂林', '广西', 25.2742, 110.2900, ['nature', 'outdoor', 'slow'], 'comfort', 'mountain', '喀斯特山水与河岸风光，是这座城市的鲜明背景。', ['漓江山水', '喀斯特地貌', '河岸漫步'], ['桂林米粉', '油茶']],
  ['guangzhou', '广州', '广东', 23.1291, 113.2644, ['food', 'urban', 'culture'], 'comfort', 'city', '从骑楼街区到珠江岸边，在早茶中开启一天。', ['骑楼街区', '珠江', '岭南文化'], ['广式早茶', '肠粉']],
  ['fuzhou', '福州', '福建', 26.0745, 119.2965, ['culture', 'food', 'slow'], 'comfort', 'town', '榕树和坊巷构成城市记忆，适合一段轻松的漫步。', ['三坊七巷', '榕城街巷', '闽江'], ['鱼丸', '肉燕']],
  ['kunming', '昆明', '云南', 25.0389, 102.7183, ['nature', 'slow', 'food'], 'comfort', 'garden', '从城市公园和湖景出发，寻找高原城市的日常。', ['翠湖', '滇池', '城市花园'], ['过桥米线', '鲜花饼']],
  ['guiyang', '贵阳', '贵州', 26.6470, 106.6302, ['food', 'nature', 'urban'], 'comfort', 'mountain', '山地城市的街头小吃与周边绿意，都可以成为出发理由。', ['甲秀楼周边', '山地城市景观', '街头小吃'], ['丝娃娃', '酸汤']],
  ['huangshan', '黄山', '安徽', 29.7147, 118.3376, ['nature', 'culture', 'outdoor'], 'comfort', 'mountain', '山景与徽州文化相伴，可按体力安排城市或周边行程。', ['徽州文化', '屯溪老街', '周边山景'], ['徽州毛豆腐', '烧饼']],
  ['nanchang', '南昌', '江西', 28.6829, 115.8582, ['culture', 'urban', 'food'], 'comfort', 'city', '沿赣江看城市，再用一碗拌粉开启街巷探索。', ['赣江', '滕王阁周边', '老城街区'], ['南昌拌粉', '瓦罐汤']],
  ['zhengzhou', '郑州', '河南', 34.7466, 113.6254, ['culture', 'food', 'urban'], 'comfort', 'city', '以城市为起点，认识中原文化与日常烟火。', ['中原文化', '城市街区', '黄河周边'], ['烩面', '胡辣汤']],
  ['taiyuan', '太原', '山西', 37.8706, 112.5489, ['culture', 'food', 'urban'], 'comfort', 'city', '在汾河岸边和老街之间，感受晋地城市生活。', ['汾河', '老城街区', '晋文化'], ['刀削面', '莜面']],
  ['shenyang', '沈阳', '辽宁', 41.8057, 123.4315, ['culture', 'urban', 'food'], 'comfort', 'city', '从历史建筑到城市街区，体验东北的生活气息。', ['沈阳故宫周边', '中街', '历史建筑'], ['老边饺子', '锅包肉']],
  ['harbin', '哈尔滨', '黑龙江', 45.8038, 126.5349, ['culture', 'urban', 'food'], 'comfort', 'city', '沿中央大街与松花江散步，观察城市建筑与江岸风景。', ['中央大街', '松花江', '历史建筑'], ['红肠', '俄式面包']],
  ['lanzhou', '兰州', '甘肃', 36.0611, 103.8343, ['culture', 'food', 'urban'], 'comfort', 'city', '一碗牛肉面之后，沿黄河认识这座城市。', ['黄河', '中山桥', '河岸步道'], ['兰州牛肉面', '酿皮']]
];

function cityDestination(row) {
  const [id, name, province, lat, lng, themes, tier, art, description, highlights, foods] = row;
  return makeDestination({ id, name, province, city: name, kind: 'city', lat, lng, themes, tier, art, description, highlights, foods });
}

function makeDestination({ id, name, province, city, kind, lat, lng, themes, tier, art, description, highlights, foods }) {
  const ranges = { light: [60, 180], comfort: [180, 380], premium: [380, 750] };
  const [min, max] = ranges[tier];
  return {
    id, name, province, city, kind,
    coordinates: { lat, lng },
    themes, tier,
    tagline: highlights.slice(0, 2).join(' · '),
    description, highlights, foods,
    seasons: ['按季节安排体验', '出发前查询当地天气'],
    climate: '没有实时天气数据；温度、降雨和预警请在出发前查询。',
    travel: '按出发地查询实际交通路线、班次与票价；此处不提供实时出行数据，地点开放及预约要求需另行核实。',
    days: kind === 'spot' ? '演示建议：留出半天至一天，按距离决定是否住宿' : '演示建议：安排两至三天，按个人节奏调整',
    localBudget: { min, max, label: '演示当地消费参考 / 人 / 天' },
    art,
    sourceUrl: '',
    sourceLabel: '公开常识整理 · 演示资料',
    dataNote: '有限示例目录，仅用于交互演示；介绍为公开常识整理，未作实时核验。消费区间为演示数值，不含往返交通，不代表真实报价或可订价格。'
  };
}

const spotRows = [
  ['juzizhou', '橘子洲', '长沙', 28.1843, 112.9573, ['nature', 'outdoor'], 'garden', '湘江中的洲岛景观，适合在江岸和绿地之间散步。', ['湘江景观', '洲岛绿地']],
  ['yuelushan', '岳麓山', '长沙', 28.1814, 112.9343, ['nature', 'culture', 'outdoor'], 'mountain', '城市西侧的山林与文化景观，可以按体力安排步行。', ['山林步道', '人文景观']],
  ['jinggang-town', '靖港古镇', '长沙', 28.4370, 112.7890, ['culture', 'slow'], 'town', '望城一带的古镇街巷，适合以慢步行认识当地生活。', ['古镇街巷', '地方文化']],
  ['summer-palace', '颐和园', '北京', 39.9999, 116.2755, ['culture', 'nature', 'slow'], 'garden', '湖山与古典园林相伴，适合留出时间慢慢欣赏建筑和景观。', ['昆明湖', '园林建筑']],
  ['fragrant-hills', '香山', '北京', 39.9904, 116.1885, ['nature', 'outdoor'], 'mountain', '北京西山一带的山林景观，可按体力安排登高。', ['山林步道', '远眺景观']],
  ['olympic-forest', '奥林匹克森林公园', '北京', 40.0208, 116.3929, ['nature', 'outdoor', 'slow'], 'garden', '城市北部的绿地空间，适合步行与轻松户外活动。', ['林地', '湖景步道']],
  ['west-lake', '西湖', '杭州', 30.2431, 120.1500, ['nature', 'culture', 'slow'], 'garden', '沿湖岸连接桥、堤与园林，适合随步行节奏安排路线。', ['湖岸步道', '桥堤景观']],
  ['xixi', '西溪湿地', '杭州', 30.2676, 120.0647, ['nature', 'slow', 'outdoor'], 'garden', '城市西部的湿地景观，可以围绕水岸和植被安排漫步。', ['湿地水系', '水岸景观']],
  ['liangzhu-site', '良渚古城遗址', '杭州', 30.3930, 119.9920, ['culture', 'outdoor'], 'garden', '通过遗址空间认识良渚文化，行前需查询参观规则。', ['古城遗址', '良渚文化']],
  ['qingcheng', '青城山', '成都', 30.8997, 103.5670, ['nature', 'culture', 'outdoor'], 'mountain', '成都周边的山林与道教文化景观，可按体力选择游览路线。', ['山林景观', '道教文化']],
  ['dujiangyan', '都江堰', '成都', 31.0010, 103.6073, ['culture', 'nature', 'outdoor'], 'mountain', '认识传统水利工程与岷江沿岸景观，适合留出步行时间。', ['水利文化', '岷江景观']],
  ['huanglongxi', '黄龙溪古镇', '成都', 30.3180, 103.9740, ['culture', 'slow', 'food'], 'town', '成都南部的古镇街巷，适合轻松漫步与品尝当地小吃。', ['古镇街巷', '水岸风光']]
];

const cities = cityRows.map(cityDestination);
const spots = spotRows.map(([id, name, city, lat, lng, themes, art, description, highlights]) => {
  const parent = cities.find(item => item.name === city);
  return makeDestination({ id, name, province: parent.province, city, kind: 'spot', lat, lng, themes, tier: 'light', art, description, highlights, foods: [...parent.foods] });
});

export const DESTINATIONS = [...cities, ...spots];
export const ORIGINS = cities.map(({ id, name, coordinates }) => ({ id, name, coordinates: { ...coordinates } }));
export const PROVINCES = [...new Set(cities.map(item => item.province))];
