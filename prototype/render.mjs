const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const e = escapeHtml;
const list = (value) => Array.isArray(value) ? value : [];
const fallbackPresets = [
  { id: 'near', title: '轻松出去走走', subtitle: '找一处附近的风景，给日常放个小假', tags: ['短途灵感', '轻盈一点'] },
  { id: 'explore', title: '想玩点不一样的', subtitle: '换座城市，收集一些没见过的日常', tags: ['换个地方', '新鲜体验'] },
  { id: 'enjoy', title: '这次想好好享受', subtitle: '慢一点，住得舒服，吃得开心', tags: ['品质体验', '慢慢度假'] },
];
const games = [
  { id: 'plane', title: '纸飞机', subtitle: '让风带你去', icon: 'plane', hint: '手指送它一程，把下一站交给风。' },
  { id: 'dart', title: '拉弓飞镖', subtitle: '凭手感出发', icon: 'target', hint: '向下拉开弓弦，松手，把好奇心射向远方。' },
  { id: 'aroma', title: '闻香旅行', subtitle: '跟着气味走', icon: 'sparkles', hint: '擦开眼前的薄雾，闻见一处新的风景。' },
  { id: 'sticks', title: '旅途签', subtitle: '抽一点好兆头', icon: 'ticket', hint: '亲手摇一摇，给自己一支出发的好签。' },
];

function icon(name, className = '', size = 20) {
  const paths = {
    plane: '<path d="m21 3-7 18-4-7-7-4 18-7Z"/><path d="m10 14 11-11"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    journey: '<rect x="4" y="6" width="16" height="15" rx="3"/><path d="M8 6V3h8v3M9 11v6m6-6v6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1"/>',
    sliders: '<path d="M4 6h5m4 0h7M4 12h10m4 0h2M4 18h2m4 0h10"/><circle cx="11" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
    pin: '<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    heart: '<path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 6l-1.1-1.2a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    share: '<path d="M12 16V3m-5 5 5-5 5 5M5 13v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    sparkles: '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4ZM20 2v4m-2-2h4"/>',
    ticket: '<path d="M4 3h16v6a3 3 0 0 0 0 6v6H4v-6a3 3 0 0 0 0-6Z"/><path d="M12 6v2m0 3v2m0 3v2"/>',
    map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16m6-14v16"/>',
    leaf: '<path d="M20 3c0 12-4 16-10 16a7 7 0 0 1-7-7C3 6 8 3 20 3Z"/><path d="M4 20 16 8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.2"/>',
    redo: '<path d="M3 10a9 9 0 1 1 1 9M3 4v6h6"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    cup: '<path d="M5 3h14v4a7 7 0 0 1-14 0V3ZM8 21h8m-4-7v7M5 5H2v3a3 3 0 0 0 4 3m13-6h3v3a3 3 0 0 1-4 3"/>',
  };
  return `<svg class="icon ${e(className)}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sparkles}</svg>`;
}

function landscape(art = 'mountain', className = '') {
  const common = '<circle cx="261" cy="41" r="19" fill="#f4bc70"/><path d="M31 46c6-10 17-10 21-1 10-7 24-1 25 8H23c0-4 4-7 8-7Zm139-20c5-8 15-8 19-1 9-5 18-1 19 7h-45c0-3 3-5 7-6Z" fill="#fff8ea"/>';
  const artShapes = {
    mountain: '<path d="M-8 163 62 65l69 92L196 39l123 134Z" fill="#9ba99a"/><path d="m143 122 53-83 55 86-31-14-21 8-22-13Z" fill="#f1efe0"/><path d="m-20 202 122-103 96 90 78-73 86 76v46H-20Z" fill="#476b58"/><path d="m0 227 101-57 112 67H0Z" fill="#78916b"/><path d="m159 240 37-91 26 6-11 85Z" fill="#c9d6c9"/>',
    coast: '<path d="M0 96q78-24 148 4t152-2v142H0Z" fill="#79adb8"/><path d="M0 135q63-22 139 0t161-4M0 160q61-20 129 0t171-4" fill="none" stroke="#d3e8df" stroke-width="3"/><path d="M0 184q116-48 300 30v26H0Z" fill="#e0c99a"/><path d="M178 57v72m0-71-42 59h42Zm4 8 34 43h-34Z" fill="#fff5df" stroke="#f9f3e5" stroke-width="2"/><path d="m133 128 90-2-20 16h-51Z" fill="#36594c"/><path d="m49 187-7-70m1 3q-35-23-43-1m44 0q17-41 39-18m-40 19q33-6 47 15" fill="none" stroke="#466b55" stroke-width="7" stroke-linecap="round"/>',
    city: '<path d="M0 205h300v35H0Z" fill="#99aea0"/><path d="M15 93h51v112H15Zm60-32h39v144H75Zm49 64h49v80h-49Zm65-35h54v115h-54Zm65 39h44v76h-44Z" fill="#b3beaf"/><path d="M91 61V36m-8 20h16" stroke="#36584b" stroke-width="4"/><path d="M16 145h58v60H16Zm129 17h55v43h-55Z" fill="#ead5ad"/><path d="m10 145 34-20 34 20m62 17 32-20 33 20" fill="#c97a55"/><path d="M30 107h9m8 0h9m30-22h15m-15 21h15m-15 21h15m41 16h18m41-34h27m-27 24h27m-27 24h27" stroke="#fff7e4" stroke-width="6"/><path d="M99 240v-31q0-13 13-13h125" fill="none" stroke="#f4ead5" stroke-width="17"/><circle cx="242" cy="195" r="17" fill="#54765b"/><path d="M242 207v22" stroke="#36584b" stroke-width="5"/>',
    garden: '<path d="M0 175q67-40 136-17t164-21v103H0Z" fill="#a5b99a"/><ellipse cx="158" cy="215" rx="115" ry="37" fill="#8ab4ab"/><path d="M59 191q78-78 160 0" fill="none" stroke="#f4e6c5" stroke-width="13"/><path d="M76 184v-21m21 7v-22m25 12v-21m26 18v-20m27 23v-21m25 32v-18" stroke="#f4e6c5" stroke-width="4"/><path d="M25 190v-73m231 70v-75" stroke="#41644f" stroke-width="6"/><circle cx="25" cy="113" r="33" fill="#709371"/><circle cx="256" cy="108" r="38" fill="#849e7b"/><circle cx="267" cy="103" r="22" fill="#e8bcac"/><path d="M115 116h79v28h-79Z" fill="#b27554"/><path d="m106 116 49-36 48 36Z" fill="#3d6052"/><path d="M146 119v25m18-25v25" stroke="#fff4df" stroke-width="5"/>',
    town: '<path d="M0 132q45-83 95-37t112-26 93 49v122H0Z" fill="#a1b3a1"/><path d="M0 215h300v25H0Z" fill="#809d82"/><path d="M24 132h64v83H24Zm74-19h63v102H98Zm76 39h94v63h-94Z" fill="#f1e1bd"/><path d="m16 132 41-32 40 32m-8-19 40-37 41 37m-4 39 56-36 57 36" fill="#416053"/><path d="M46 171h21v44H46Zm75-24h19v26h-19Zm76 25h16v26h-16Zm35 0h16v26h-16Z" fill="#b88862"/><path d="M0 240q50-28 100-15t113-3 87 7" fill="none" stroke="#a9c8bc" stroke-width="17"/>',
  };
  return `<svg class="landscape ${e(className)}" viewBox="0 0 300 240" fill="none" aria-hidden="true"><rect width="300" height="240" fill="#dce8e3"/>${common}${artShapes[art] || artShapes.city}<path d="m233 59 23-8-9 18-4-7-10-3Z" fill="#fff9ec"/><path d="m243 62 13-11" stroke="#729486" stroke-width="1.4"/></svg>`;
}

function button(label, action, className = 'button primary', attributes = '') {
  return `<button type="button" class="${className}" data-action="${action}" ${attributes}>${label}</button>`;
}
function brandAvatar(className = '') {
  return `<img class="brand-avatar ${className}" src="./assets/brand/suixing-chufa-avatar-v3-plane-rider.png" width="64" height="64" alt="坐着纸飞机的小旅行者" decoding="async">`;
}
const selected = (value, expected) => value === expected ? ' selected' : '';
const checked = (value) => value ? ' checked' : '';
const disabled = (value) => value ? ' disabled' : '';
const getDestination = (item) => item?.destination || item;
function presetList(state) { return list(state.catalog?.presets).length ? state.catalog.presets : fallbackPresets; }
function themeList(state) { return list(state.catalog?.themes); }
function filterSummary(state, filters = state.filters) {
  const origins = list(state.catalog?.origins);
  const origin = origins.find((item) => item.id === filters?.originId);
  const themes = themeList(state).filter((item) => list(filters?.themeIds).includes(item.id));
  const segments = [list(filters?.provinces).length ? list(filters.provinces).join('、') : '全国随缘'];
  if (origin) segments.push(`从${origin.name}出发`);
  if (filters?.maxDistanceKm) segments.push(`${filters.maxDistanceKm} km 内`);
  if (themes.length) segments.push(themes.map((item) => item.label).join(' / '));
  if (list(filters?.customNames).length) segments.push(`自填 ${filters.customNames.length} 个备选`);
  return segments.join(' · ');
}
function themePills(state, limit = 4) {
  return themeList(state).slice(0, limit).map((theme) => `<button class="chip ${list(state.filters?.themeIds).includes(theme.id) ? 'active' : ''}" data-action="set-theme" data-id="${e(theme.id)}" aria-pressed="${list(state.filters?.themeIds).includes(theme.id)}">${e(theme.label)}</button>`).join('');
}

function home(state) {
  const presets = presetList(state);
  const presentation = fallbackPresets;
  return `<section class="home-view">
    <div class="home-heading"><div><p class="eyebrow">LET'S GO SOMEWHERE</p><h1>今天，想怎么出发<span class="orange">？</span></h1></div><span class="little-stamp">随心<br>即刻</span></div>
    <p class="muted home-subtitle">不用想好目的地，先选一个心情。</p>
    <div class="preset-list">${presets.slice(0, 3).map((preset, index) => {
      const details = presentation.find((item) => item.id === preset.id) || presentation[index];
      return `<button class="preset-card preset-${index} ${state.presetId === preset.id ? 'is-selected' : ''}" data-action="select-preset" data-id="${e(preset.id)}"><span class="preset-copy"><span class="card-kicker">0${index + 1} / ${['A LITTLE BREAK', 'SOMETHING NEW', 'TAKE IT SLOW'][index]}</span><strong>${e(details.title)}</strong><span class="preset-description">${e(details.subtitle)}</span><span class="preset-tags">${list(preset.tags).slice(0, 2).map((tag) => `<span>${e(tag)}</span>`).join('')}</span></span><span class="preset-art">${landscape(['garden', 'town', 'coast'][index])}</span><span class="preset-arrow">${icon('arrow', '', 18)}</span></button>`;
    }).join('')}</div>
    <div class="home-controls"><div class="section-row"><span class="small-title">想加一点什么？<span class="optional">可跳过</span></span>${button('全部主题 ' + icon('chevron', '', 13), 'open-modal', 'text-button', 'data-modal="theme"')}</div><div class="chip-row">${themePills(state)}</div></div>
    <div class="departure-options"><div class="mode-toggle" aria-label="出发方式">${button(icon('user', '', 16) + ' 一个人', 'set-mode', `mode-button ${state.mode === 'solo' ? 'active' : ''}`, 'data-id="solo"')}${button(icon('users', '', 17) + ' 一起决定', 'set-mode', `mode-button ${state.mode === 'group' ? 'active' : ''}`, 'data-id="group"')}</div>${button(icon('sliders', '', 15) + ' 微调一下', 'open-modal', 'text-button', 'data-modal="filters"')}</div>
    <div class="condition-line">${icon('pin', '', 13)}<span>${e(filterSummary(state))}</span></div>
    ${state.mode === 'group' ? button('邀请大家，一起决定 ' + icon('users', '', 18), 'create-room', 'button primary launch-entry', disabled(state.busy)) : ''}
    <div class="secondary-row">${button('全国随缘，直接抽 ' + icon('sparkles', '', 14), 'quick-random', 'text-button quick-random', disabled(state.busy))}${button('我有备选名单', 'open-modal', 'text-button underlined', 'data-modal="custom"')}</div>
    <p class="catalog-note">${icon('info', '', 12)} 示例目的地，供你发现灵感</p>
  </section>`;
}

function gameStage(gameId, revealing, elapsed = 0) {
  const classes = `game-stage stage-${gameId} ${revealing ? 'revealing' : ''}`;
  const endingDelay = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const instructions = {
    plane: ['按住飞机向上推，蓄满后松手放飞', '向上送它一程', '放飞进度'],
    dart: ['按住箭尾向下拉，蓄满后松手射出', '向下拉开弓弦', '拉弓进度'],
    aroma: ['来回擦开薄雾，露出香气后松手', '在薄雾上轻轻擦一擦', '擦雾进度'],
    sticks: ['按住签筒左右来回摇，蓄满后松手', '左右摇一摇', '摇签进度'],
  };
  const [hint, invitation, progressLabel] = instructions[gameId] || instructions.plane;
  const plane = `<div class="wind wind-one"></div><div class="wind wind-two"></div><div class="wind wind-three"></div><div class="flight-path"></div><div class="flying-plane"><svg viewBox="0 0 120 100" fill="none" aria-hidden="true"><path d="m8 40 103-32-37 84-21-31-45-21Z" fill="#fffdf2" stroke="#36594c" stroke-width="2"/><path d="m53 61 58-53-42 69-16-16Z" fill="#bed8ce" stroke="#36594c" stroke-width="2"/><path d="m53 61-4 19 20-3" stroke="#36594c" stroke-width="2"/></svg></div><span class="game-sun"></span><span class="cloud cloud-one"></span><span class="cloud cloud-two"></span><div class="mini-hills"><span></span><span></span><span></span></div><div class="gesture-affordance plane-grip"><span class="gesture-direction">↑</span><span>${invitation}</span></div>`;
  const dart = `<div class="dart-board" aria-hidden="true"><div></div><span class="board-cross horizontal"></span><span class="board-cross vertical"></span></div><svg class="bow-frame" viewBox="0 0 300 180" width="300" height="180" fill="none" aria-hidden="true"><path class="bow-shadow" d="M 45 45 Q 150 -13 255 45"/><path class="bow-body" d="M 45 45 Q 150 -13 255 45"/><path class="bow-grip" d="M 136 18 Q 150 15 164 18"/><path class="bow-string" data-bow-string d="M 45 45 L 150 82 L 255 45"/><circle cx="45" cy="45" r="4" fill="#58755c"/><circle cx="255" cy="45" r="4" fill="#58755c"/></svg><div class="flying-dart"><svg viewBox="0 0 32 100" fill="none" aria-hidden="true"><path d="M 16 84 V 11" stroke="#496a54" stroke-width="3" stroke-linecap="round"/><path d="m 16 3 -8 17 8 -4 8 4 Z" fill="#3e6250"/><path d="m 15 63 -9 6 v 17 l 9 -7 m 2 -16 9 6 v 17 l -9 -7" fill="#cc8056" stroke="#aa6846" stroke-width="1"/><path d="M 16 78 v 8" stroke="#f8eed8" stroke-width="2"/></svg></div><div class="gesture-affordance bow-pull"><span class="grip-lines">≡</span><span>${invitation} ↓</span></div>`;
  const aroma = `<div class="aroma-aura"></div><div class="aroma-scenery">${landscape('garden')}</div><span class="aroma-leaf leaf-one">${icon('leaf', '', 32)}</span><span class="aroma-leaf leaf-two">${icon('leaf', '', 25)}</span><div class="aroma-mist mist-one"></div><div class="aroma-mist mist-two"></div><div class="aroma-mist mist-three"></div><div class="aroma-bottle"><div class="bottle-lid"></div><div class="bottle-neck"></div><div class="bottle-body"><span class="bottle-label">随性<br><i>EAU DE VOYAGE</i>${icon('leaf', '', 26)}</span></div></div><canvas class="aroma-fog" aria-hidden="true"></canvas><div class="gesture-affordance aroma-cue">${icon('sparkles', '', 25)}<span>${invitation}</span><small>每擦开一片，就更近一点</small></div>`;
  const sticks = `<div class="stick-glow"></div><div class="fortune-container"><div class="fortune-sticks">${[0, 1, 2, 3, 4, 5, 6].map((index) => `<i class="fortune-stick stick-${index}"><span>行</span></i>`).join('')}</div><div class="fortune-cup"><span>旅</span><small>好事在路上</small><i class="cup-grip" aria-hidden="true"></i></div></div><span class="fortune-spark spark-one">✦</span><span class="fortune-spark spark-two">✦</span><div class="gesture-affordance sticks-grip"><span class="gesture-direction">↔</span><span>${invitation}</span></div>`;
  return `<div id="game-stage" class="${classes}"${revealing ? ` style="--power:1;--ending-delay:-${endingDelay}ms"` : ''} role="group" aria-label="${e(games.find((game) => game.id === gameId)?.title || '纸飞机')}抽取场景" aria-describedby="gesture-hint" aria-busy="${Boolean(revealing)}"><div class="gesture-instruction"><span class="gesture-kicker">亲手开启 · 一点好运</span><p id="gesture-hint" data-gesture-hint role="status" aria-live="polite">${revealing ? '好奇心已出发，下一站就要揭晓' : hint}</p></div>${({ plane, dart, aroma, sticks })[gameId] || plane}<div class="gesture-meter"><div class="gesture-meter-label"><span>${progressLabel}</span><span data-gesture-value>${revealing ? '100%' : '0%'}</span></div><div class="gesture-progress" data-gesture-progress role="progressbar" aria-label="${progressLabel}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${revealing ? 100 : 0}"><span class="gesture-progress-fill"></span></div></div></div>`;
}
function game(state) {
  const current = games.find((item) => item.id === state.gameId) || games[0];
  return `<section class="game-view"><div class="page-intro"><p class="eyebrow">A LITTLE SURPRISE</p><h1>下一站，交给一点运气</h1><p class="muted">${e(current.hint)}</p></div>
    <div class="game-tabs" aria-label="抽取玩法">${games.map((item) => `<button class="game-tab ${current.id === item.id ? 'active' : ''}" data-action="set-game" data-id="${item.id}" aria-pressed="${current.id === item.id}" ${disabled(state.busy || state.revealing)}>${icon(item.icon, '', 21)}<strong>${item.title}</strong><span>${item.subtitle}</span></button>`).join('')}</div>
    ${gameStage(current.id, state.revealing, state.gestureElapsed)}
    ${current.id === 'sticks' && !state.revealing ? `<div class="motion-controls">${button(icon('sparkles', '', 16) + ' 开启手机摇一摇', 'enable-motion', 'motion-enable', 'data-motion-enable aria-describedby="motion-status"')}<p id="motion-status" class="motion-status" data-motion-status role="status" aria-live="polite">也可以用手指左右拖动签筒</p></div>` : ''}
    <div class="game-caption"><span class="tiny-label">这一次的出发范围</span><strong>${e(filterSummary(state))}</strong>${button('调整 ' + icon('sliders', '', 13), 'open-modal', 'text-button', 'data-modal="filters"')}</div>
    ${state.poolCount ? `<p class="pool-note">${e(state.poolCount)} 个候选，各有同样的相遇机会</p>` : '<p class="pool-note">最终候选等概率抽取，玩法只负责添一点乐趣</p>'}
    ${!state.revealing ? button('查看全部候选与排除原因', 'open-modal', 'text-button candidates-entry', 'data-modal="candidates"') : ''}
    ${state.revealing ? `<div class="reveal-actions"><p class="revealing-text"><span></span>正在把好奇心送往下一站…</p>${button('跳过动画，看看目的地 ' + icon('arrow', '', 16), 'skip-animation', 'button secondary')}</div>` : button(state.busy ? '准备出发…' : '不方便操作？直接揭晓', 'launch', 'text-button gesture-fallback', disabled(state.busy))}
    <label class="motion-setting"><input type="checkbox" data-field="reduceMotion"${checked(state.reduceMotion)} /> 简化动画</label>
  </section>`;
}

function budgetText(destination) {
  const budget = destination?.localBudget;
  if (!budget) return '当地消费待了解';
  if (typeof budget === 'string') return budget;
  if (Array.isArray(budget)) return `¥${budget[0]}–${budget[1]} / 人 / 天`;
  return `¥${budget.min ?? '—'}–${budget.max ?? '—'} / 人 / 天`;
}
function result(state) {
  const destination = state.destination;
  if (!destination) return empty('还没决定下一站', '给一点好奇心，抽一个值得期待的地方。', '回到出发页', 'home');
  const saved = list(state.saved).some((item) => getDestination(item)?.id === destination.id);
  const place = [destination.province, destination.city].filter(Boolean).filter((part, index, all) => all.indexOf(part) === index).join(' · ');
  const highlights = list(destination.highlights).slice(0, 3);
  const foods = list(destination.foods);
  return `<section class="result-view"><div class="result-topline"><span class="eyebrow">YOUR NEXT DESTINATION</span><span class="result-draw-label">${state.resultRound ? `第 ${e(state.resultRound)} 轮共同决定` : '偶然相遇 · 恰好心动'}</span></div>
    <article class="destination-postcard"><div class="postcard-art">${landscape(destination.art)}<span class="postcard-stamp">${destination.kind === 'spot' ? '去看风景' : '去逛一座城'}<br><small>LET'S GO</small></span><span class="postcard-airmail">◩ ◩ ◩ ◩ ◩</span></div><div class="postcard-copy"><span class="postcard-location">${icon('pin', '', 14)} ${e(place || '你的自填目的地')}</span><h1 data-testid="destination-name">${e(destination.name)}</h1><p>${e(destination.tagline || '有些好故事，要出发才会遇见。')}</p><div class="postcard-footer"><span>TO: ${e(state.mode === 'group' ? '我们' : state.nickname || '旅行者')}</span>${icon('plane', '', 20)}<span>FROM: 一点好运</span></div></div></article>
    <div class="result-summary"><span>${icon('clock', '', 16)}${e(destination.days || '停留安排待了解')}</span><span>${icon('ticket', '', 16)}${e(budgetText(destination))}</span></div>
    ${state.ritual ? `<aside class="ritual-note"><span>${icon('sparkles', '', 16)}</span><div><strong>这次出发的小记</strong><p>${e(state.ritual)}</p></div></aside>` : ''}
    <div class="section-row result-section-heading"><h2>先认识一下${e(destination.name)}</h2>${button(state.detailExpanded ? '收起 ' + icon('down', 'flip', 14) : '多了解一点 ' + icon('down', '', 14), 'expand-details', 'text-button', `aria-expanded="${Boolean(state.detailExpanded)}"`)}</div>
    <p class="destination-description">${e(destination.description || '这是一处你亲手加入的备选。出发前，花一点时间了解它的交通、开放信息和当地体验。')}</p>
    ${state.detailExpanded ? `<div class="details-panel"><div><span>季节与气候</span><p>${e(list(destination.seasons).join('、') || '适合季节待了解')} · ${e(destination.climate || '天气需临行查询')}</p></div><div><span>怎么抵达</span><p>${e(destination.travel || '从出发城市查询路线、班次与交通费用')}</p></div><div><span>当地吃点什么</span><p>${e(foods.length ? foods.join('、') : '还没有核实的当地美食资料，期待你自己发现。')}</p></div>${destination.sourceUrl ? `<a class="source-link" href="${safeUrl(destination.sourceUrl)}" target="_blank" rel="noopener noreferrer">${e(destination.sourceLabel || '目的地资料来源')} ${icon('arrow', '', 13)}</a>` : ''}</div>` : ''}
    <div class="section-row"><h2>到那里，做三件小事</h2><span class="small-script">慢慢来，就很好</span></div><ol class="little-plans">${(highlights.length ? highlights : ['了解当地路线，挑一处想去的地方', '留一点空白，找喜欢的吃食和街角', '把这次出发，记进自己的旅行手账']).map((item, index) => `<li><span>0${index + 1}</span><p>${e(item)}</p>${icon(['leaf', 'sun', 'cup'][index], '', 17)}</li>`).join('')}</ol>
    <div class="data-note">${icon('info', '', 16)}<p>${e(destination.dataNote || '示例资料，供发现旅行灵感。')}<span>消费参考仅含当地消费；天气、班次、余票与开放信息需在出发前核实。</span></p></div>
    <div class="result-tools">${button(icon('heart', saved ? 'filled-heart' : '', 18) + (saved ? '已收藏' : '收藏灵感'), 'save-destination', `button quiet ${saved ? 'is-saved' : ''}`)}${button(icon('share', '', 18) + ' 分享给朋友', 'copy-share', 'button quiet')}</div>
    ${button('好，就去这里 ' + icon('check', '', 19), 'accept-destination', 'button primary large')}
    ${button(icon('redo', '', 15) + ' 再遇见一个地方', 'draw-again', 'text-button draw-again', disabled(state.busy))}
  </section>`;
}
function safeUrl(value) {
  try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol) ? e(url.href) : '#'; } catch { return '#'; }
}

function room(state) {
  const currentRoom = state.room;
  if (!currentRoom) return `<section class="room-view"><div class="page-intro"><p class="eyebrow">BETTER TOGETHER</p><h1>把下一站，一起决定</h1><p class="muted">每个人都能带来想法，准备好再一起抽。</p></div><div class="room-illustration">${landscape('coast')}<span>${icon('users', '', 44)}</span></div><div class="info-card"><h2>两个人或更多人，一起出发</h2><p>分享邀请号，大家加入并确认各自条件。共同候选确定后，每人都准备好了才能抽。</p></div>${button(icon('plus', '', 18) + ' 发起一次共同决定', 'create-room', 'button primary large', disabled(state.busy))}${button('我有邀请号，加入朋友', 'open-modal', 'button secondary', 'data-modal="join"')}</section>`;
  const members = list(currentRoom.members);
  const me = members.find((member) => member.id === state.clientId);
  const readyCount = members.filter((member) => member.ready).length;
  const allReady = members.length >= 2 && readyCount === members.length;
  const candidates = list(currentRoom.candidates);
  const roomDestination = currentRoom.destination;
  return `<section class="room-view"><div class="room-heading"><div><p class="eyebrow">OUR LITTLE ADVENTURE</p><h1>下一站，我们一起选</h1></div><span class="round-pill">第 ${e(currentRoom.round)} 轮</span></div><div class="invite-card"><div><span class="tiny-label">把这个邀请号发给朋友</span><strong data-room-code="${e(currentRoom.inviteCode)}">${e(currentRoom.inviteCode)}</strong></div>${button(icon('copy', '', 17) + ' 复制邀请', 'copy-share', 'button invitation-button')}</div>
    <div class="section-row"><h2>出发小队 <span class="count">${members.length} 人</span></h2><span class="small-muted">${readyCount}/${members.length} 已准备</span></div><div class="member-list">${members.map((member, index) => `<div class="member-card" data-member-id="${e(member.id)}"><span class="avatar avatar-${index % 4}">${e(String(member.nickname || '旅').slice(0, 1))}</span><div><strong>${e(member.nickname || '旅行者')}${member.id === state.clientId ? '<span class="me-label">我</span>' : ''}</strong><p>${e(filterSummary(state, member.filters))}</p></div><span class="member-status ${member.ready ? 'ready' : ''}">${icon(member.ready ? 'check' : 'clock', '', 13)}${member.ready ? '准备好了' : '等我一下'}</span></div>`).join('')}</div>
    <div class="room-candidates"><div class="section-row"><h2>大家的共同候选</h2><span class="count">${candidates.length} 个</span></div>${candidates.length ? `<div class="candidate-chips">${candidates.slice(0, 8).map((candidate) => `<span>${e(typeof candidate === 'string' ? candidate : candidate.name)}</span>`).join('')}${candidates.length > 8 ? button(`查看其余 ${candidates.length - 8} 个`, 'open-modal', 'text-button more-candidates', 'data-modal="candidates"') : ''}</div><p class="small-muted">每个候选都有同样的机会；改条件后，大家需要重新准备。</p>` : '<p class="small-muted empty-candidates">还没有共同候选。试着放宽地区、主题或预算条件。</p>'}${button('查看全部候选与排除原因', 'open-modal', 'text-button candidates-entry', 'data-modal="candidates"')}<div class="secondary-row">${button(icon('sliders', '', 15) + ' 调整我的条件', 'open-modal', 'text-button', 'data-modal="filters"')}${button(icon('plus', '', 14) + ' 添加我的备选', 'open-modal', 'text-button', 'data-modal="custom"')}</div></div>
    ${roomDestination ? `<article class="room-result"><div class="room-result-art">${landscape(roomDestination.art)}</div><div><span class="tiny-label">这一轮，共同决定去</span><h2 data-testid="destination-name">${e(roomDestination.name)}</h2><p>${e(roomDestination.tagline)}</p></div></article>${button('看看这个目的地 ' + icon('arrow', '', 17), 'go', 'button primary', 'data-screen="result"')}${button('开始下一轮', 'next-round', 'button secondary', disabled(state.busy))}` : `<div class="room-progress"><span class="progress-dots">${members.map((member) => `<i class="${member.ready ? 'done' : ''}"></i>`).join('')}</span><p>${members.length < 2 ? '邀请一位朋友加入，才可以一起决定。' : allReady ? '所有人都准备好了，下一站等待揭晓。' : '等每个人准备好，再把好运一起打开。'}</p></div>${button(icon(me?.ready ? 'check' : 'user', '', 18) + (me?.ready ? '我已准备好' : '我准备好了'), 'ready-room', `button ${me?.ready ? 'secondary' : 'primary'}`, disabled(state.busy || !me || me.ready || !candidates.length))}${button(icon('sparkles', '', 18) + ' 一起揭晓目的地', 'draw-room', 'button primary', disabled(state.busy || !allReady || !candidates.length))}`}
    ${button('离开这次共同决定', 'leave-room', 'text-button leave-room', disabled(state.busy))}</section>`;
}

function empty(title, description, label, screen) {
  return `<section class="empty-state"><div class="empty-art">${landscape('mountain')}${icon('plane', '', 38)}</div><p class="eyebrow">STORIES WAITING TO HAPPEN</p><h1>${e(title)}</h1><p>${e(description)}</p>${button(label + ' ' + icon('arrow', '', 16), 'go', 'button primary', `data-screen="${screen}"`)}</section>`;
}
function journeyCard(item, index) {
  const destination = getDestination(item);
  const completed = item.status === 'completed' || item.completed;
  return `<article class="journey-card"><div class="journey-art">${landscape(destination?.art)}</div><div class="journey-copy"><span class="journey-state ${completed ? 'completed' : ''}">${completed ? '已经走过' : '期待出发'}</span><h2>${e(destination?.name || '未命名的旅程')}</h2><p>${e(destination?.tagline || '把这个目的地，写进未来的计划。')}</p>${completed ? `<span class="travel-seal">${icon('check', '', 13)} 这一站，已抵达</span>` : button('我已经去过了 ' + icon('check', '', 13), 'complete-journey', 'text-button', `data-id="${e(item.id ?? index)}"`)}</div></article>`;
}
function journeys(state) {
  const items = list(state.journeys);
  if (!items.length) return empty('旅行手账，还等着第一笔', '遇见喜欢的目的地，点「好，就去这里」。下一段故事就从这里开始。', '发现我的下一站', 'home');
  const completed = items.filter((item) => item.status === 'completed' || item.completed).length;
  return `<section class="journeys-view"><div class="page-intro"><p class="eyebrow">MY TRAVEL JOURNAL</p><h1>每一站，都是我的故事</h1><p class="muted">${items.length - completed} 个期待 · ${completed} 段已经发生的美好</p></div><div class="journal-quote">“走过的地方，会变成自己的光。”<span>写给在路上的你</span></div><div class="journey-list">${items.map(journeyCard).join('')}</div></section>`;
}
function profile(state) {
  const saved = list(state.saved);
  const completed = list(state.journeys).filter((item) => item.status === 'completed' || item.completed);
  return `<section class="profile-view"><div class="profile-card"><span class="profile-avatar">${icon('user', '', 34)}</span><div><p class="eyebrow">A CURIOUS SOUL</p><h1>${e(state.nickname || '旅行者')}</h1><p>保持好奇，故事总会发生。</p></div>${button(icon('sliders', '', 18), 'open-modal', 'icon-button edit-name', 'data-modal="nickname" aria-label="修改昵称"')}</div><div class="profile-stats"><div><strong>${saved.length}</strong><span>心动灵感</span></div><div><strong>${list(state.journeys).length}</strong><span>出发计划</span></div><div><strong>${completed.length}</strong><span>旅行印章</span></div></div><div class="section-row"><h2>我的心动收藏</h2>${icon('heart', '', 18)}</div>${saved.length ? `<div class="saved-grid">${saved.map((item) => { const destination = getDestination(item); return `<article class="saved-card"><div>${landscape(destination?.art)}<span>${icon('heart', 'filled-heart', 15)}</span></div><h3>${e(destination?.name)}</h3><p>${e(destination?.province || '自填灵感')}</p></article>`; }).join('')}</div>` : '<div class="small-empty"><span>♡</span><h3>把喜欢的地方，先留在心里</h3><p>收藏目的地，想出发时再回来看看。</p></div>'}<div class="section-row stamp-heading"><h2>旅途收集册</h2><span class="small-muted">每完成一站，留下一个印章</span></div><div class="stamp-collection">${completed.length ? completed.map((item) => `<div class="collected-stamp">${icon('pin', '', 21)}<strong>${e(getDestination(item)?.name)}</strong><span>BEEN THERE · 随性出发</span></div>`).join('') : '<div class="blank-stamp">第一枚印章<br><span>在路上等你</span></div><div class="blank-stamp pale">好故事<br><span>正在发生</span></div>'}</div><div class="profile-links">${button(icon('users', '', 19) + '<span>加入朋友的共同决定</span>' + icon('chevron', '', 16), 'open-modal', 'profile-link', 'data-modal="join"')}${button(icon('ticket', '', 19) + '<span>打开一封出发小纸条</span>' + icon('chevron', '', 16), 'show-easter', 'profile-link', 'data-kind="note"')}</div><p class="profile-signoff">愿你的下一个周末，<br>有一段意想不到的好时光。</p></section>`;
}

function field(label, content, help = '') { return `<label class="form-field"><span class="field-label">${label}</span>${content}${help ? `<span class="field-help">${help}</span>` : ''}</label>`; }
function filtersModal(state) {
  const draft = { ...state.filters, ...state.modalDraft };
  const origins = list(state.catalog?.origins);
  const provinces = list(state.catalog?.provinces);
  return `<div class="modal-description">让范围更合心意。没选的条件，就交给缘分。</div>${field('这次出发的心情', `<select data-field="preset">${presetList(state).map((preset) => `<option value="${e(preset.id)}"${selected(draft.preset, preset.id)}>${e(fallbackPresets.find((item) => item.id === preset.id)?.title || preset.title)}</option>`).join('')}</select>`)}${field('从哪里出发', `<select data-field="originId"><option value="">先不确定出发城市</option>${origins.map((origin) => `<option value="${e(origin.id)}"${selected(draft.originId, origin.id)}>${e(origin.name)}</option>`).join('')}</select>`, '短途灵感需要出发城市；当前按地理距离筛选。')}
    <div class="field-pair">${field('想去的地方', `<select data-field="kind"><option value="city"${selected(draft.kind, 'city')}>城市</option><option value="spot"${selected(draft.kind, 'spot')}>景点</option></select>`)}${field('距离上限 · km', `<input type="number" min="1" max="6000" step="10" inputmode="numeric" placeholder="不限" data-field="maxDistanceKm" value="${e(draft.maxDistanceKm)}" />`)}</div>
    ${field('当地消费参考上限 · 元 / 人 / 天', `<input type="number" min="0" max="100000" step="50" inputmode="numeric" placeholder="不限" data-field="maxBudget" value="${e(draft.maxBudget)}" />`, '仅筛选当地消费参考，不包含到达目的地的交通费用。')}
    <fieldset class="province-field"><legend>去哪里 <span class="optional">不选就是全国随缘</span></legend><div class="province-options">${provinces.map((province) => `<label><input type="checkbox" name="province" value="${e(province)}"${checked(list(draft.provinces).includes(province))} /><span>${e(province)}</span></label>`).join('')}</div></fieldset>
    ${field('出发小游戏', `<select data-field="gameId">${games.map((game) => `<option value="${game.id}"${selected(state.modalDraft?.gameId ?? state.gameId, game.id)}>${game.title}</option>`).join('')}</select>`)}
    ${button('就按这个范围出发 ' + icon('check', '', 17), 'apply-filters', 'button primary modal-submit', disabled(state.busy))}`;
}
function modal(state) {
  if (!state.modal) return '';
  const titles = { filters: '微调一下出发范围', custom: '把心里的备选，写下来', join: '加入朋友的出发小队', theme: '给旅途添一点喜欢', nickname: '这本手账，怎么称呼你', origin: '从哪里出发', candidates: '这一次，可能遇见的地方' };
  let content;
  switch (state.modal) {
    case 'candidates': {
      const names = state.mode === 'group' && state.room ? list(state.room.candidates).map(item => item.name) : list(state.candidateNames);
      const rejected = state.mode === 'group' && state.room ? list(state.room.rejected) : list(state.rejected);
      content = `<p class="modal-description">这里是本次抽取的完整候选名单。每个地方都有同样的机会，等概率抽取；玩法不会改变机会。当地消费为演示参考，不含往返交通。</p><h3 class="candidate-section-title">最终候选 · ${names.length} 个</h3>${names.length ? `<ul class="candidate-full-list">${names.map(name => `<li data-candidate-name="${e(name)}">${e(name)}<span>1 / ${names.length}</span></li>`).join('')}</ul>` : '<p class="modal-description">没有符合全部条件的候选，请查看下方原因并微调条件。</p>'}<h3 class="candidate-section-title">本次排除 · ${rejected.length} 个</h3>${rejected.length ? `<ul class="candidate-rejections">${rejected.map(item => `<li data-rejected-name="${e(item.name)}"><strong>${e(item.name)}</strong><p>${e(item.reason)}</p></li>`).join('')}</ul>` : '<p class="modal-description">当前名单没有被条件排除的地方。</p>'}`;
      break;
    }
    case 'filters': content = filtersModal(state); break;
    case 'custom': content = `<p class="modal-description">想到哪儿就写哪儿。每行一个，或用逗号隔开。</p>${field('我的备选目的地', `<textarea rows="7" maxlength="3000" data-field="customText" placeholder="比如：杭州&#10;大理&#10;海边的那座小城">${e(state.modalDraft?.customText ?? list(state.filters?.customNames).join('\n'))}</textarea>`)}<p class="field-help custom-tip">写进名单的名字会成为抽取候选。没收录的地方，详情先留白，出发前再了解。</p>${button('从我的备选里选 ' + icon('arrow', '', 17), 'apply-custom', 'button primary modal-submit', disabled(state.busy))}`; break;
    case 'join': content = `<div class="join-mark">${icon('users', '', 36)}</div><p class="modal-description">朋友发来的邀请号，是这次共同出发的入口。</p>${field('邀请号', `<input type="text" maxlength="12" autocapitalize="characters" autocomplete="off" spellcheck="false" data-field="inviteCode" value="${e(state.modalDraft?.inviteCode)}" placeholder="输入邀请号" class="invite-input" />`)}${field('队友会看到的昵称', `<input type="text" maxlength="24" data-field="nickname" value="${e(state.modalDraft?.nickname ?? state.nickname)}" placeholder="怎么称呼你" />`)}${button('加入，一起选下一站 ' + icon('arrow', '', 17), 'join-room', 'button primary modal-submit', disabled(state.busy))}`; break;
    case 'theme': { const themeIds = list(state.modalDraft?.themeIds ?? state.filters?.themeIds); content = `<p class="modal-description">选一两个心动的主题，也可以都不选，让惊喜自然发生。</p><div class="theme-options">${themeList(state).map((theme, index) => `<button class="theme-option ${themeIds.includes(theme.id) ? 'active' : ''}" data-action="set-theme" data-id="${e(theme.id)}" aria-pressed="${themeIds.includes(theme.id)}">${icon(['leaf', 'home', 'map', 'cup', 'sun', 'clock'][index % 6], '', 26)}<strong>${e(theme.label)}</strong><span>${themeIds.includes(theme.id) ? icon('check', '', 14) : icon('plus', '', 14)}</span></button>`).join('')}</div>${button('带上这份心情 ' + icon('check', '', 17), 'apply-theme', 'button primary modal-submit')}${button('暂时不想选主题', 'close-modal', 'text-button modal-skip')}`; break; }
    case 'nickname': content = `<p class="modal-description">一个轻松的称呼，送给每次想出发的自己。</p>${field('昵称', `<input type="text" maxlength="24" data-field="nickname" value="${e(state.modalDraft?.nickname ?? state.nickname)}" placeholder="旅行者" />`)}${button('记下这个名字 ' + icon('check', '', 17), 'apply-nickname', 'button primary modal-submit')}`; break;
    case 'origin': content = `<p class="modal-description">给附近的小旅行一个起点，按地理距离找一处风景。</p>${field('出发城市', `<select data-field="originId"><option value="">选一个出发城市</option>${list(state.catalog?.origins).map((origin) => `<option value="${e(origin.id)}"${selected(state.modalDraft?.originId ?? state.filters?.originId, origin.id)}>${e(origin.name)}</option>`).join('')}</select>`, '短途灵感默认筛选 120 km 内，交通耗时请在出发前查询。')}${button('从这里，轻松出发 ' + icon('arrow', '', 17), 'apply-origin', 'button primary modal-submit', disabled(state.busy))}`; break;
    default: content = '<p class="modal-description">新的故事，正在路上。</p>';
  }
  return `<div class="modal-overlay"><button class="modal-backdrop" data-action="close-modal" aria-label="关闭面板"></button><section class="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div class="sheet-handle"></div><div class="sheet-heading"><h2 id="sheet-title">${e(titles[state.modal] || '随性出发')}</h2>${button(icon('close', '', 20), 'close-modal', 'icon-button', 'aria-label="关闭面板"')}</div><div class="sheet-content">${state.error ? `<div class="error-banner" role="alert">${icon('info', '', 17)}<span>${e(state.error)}</span></div>` : ''}${content}</div></section></div>`;
}

function sidebar() {
  return `<aside class="brand-sidebar"><div class="desktop-logo">${brandAvatar('sidebar-avatar')}<strong>随性出发</strong><span>WANDER A LITTLE</span></div><div class="sidebar-heading"><span class="eyebrow">把好奇心，装进行李</span><h1>下一站，<br>听心的。</h1><p>有时，最好的旅行计划，<br>是给自己一点意想不到。</p></div><div class="desktop-doodle">${landscape('mountain')}<span class="doodle-caption">好故事，总在路上。</span></div><div class="desktop-guide"><span>01</span><p>选一种心情<br><strong>不用先想好目的地</strong></p><span>02</span><p>打开一点惊喜<br><strong>四种玩法，发现下一站</strong></p><span>03</span><p>和喜欢的人出发<br><strong>自己决定，或和朋友一起选</strong></p></div><footer>示例目录 / 非实时数据 · 收藏与旅程保存在本浏览器</footer></aside>`;
}
function navigation(state) {
  return `<nav class="bottom-navigation" aria-label="主导航">${[{ screen: 'home', label: '出发', iconName: 'home' }, { screen: 'journeys', label: '旅程', iconName: 'journey' }, { screen: 'profile', label: '我的', iconName: 'user' }].map((item) => `<button data-action="go" data-screen="${item.screen}" class="nav-item ${state.screen === item.screen || (item.screen === 'home' && ['game', 'result', 'room'].includes(state.screen)) ? 'active' : ''}" ${state.screen === item.screen ? 'aria-current="page"' : ''}>${icon(item.iconName, '', 23)}<span>${item.label}</span></button>`).join('')}</nav>`;
}
export function renderApp(state) {
  const renderers = { home, game, result, room, journeys, profile };
  const screen = renderers[state.screen] ? state.screen : 'home';
  const titles = { home: '随性出发', game: '一点出发的仪式感', result: '下一站的邀请', room: '共同决定', journeys: '我的旅行手账', profile: '我的随性时刻' };
  return `<div class="app-shell">${sidebar()}<main class="phone travel-workspace ${state.revealing ? 'is-revealing' : ''}" data-current-screen="${screen}"><header class="app-header"><div class="header-start">${['game', 'result', 'room'].includes(screen) ? button(icon('back', '', 20), 'go', 'icon-button back-button', 'data-screen="home" aria-label="回到出发页"') : ''}${brandAvatar('header-avatar')}<span>${titles[screen]}</span></div>${button(icon('share', '', 16) + '<span>分享</span>', 'copy-share', 'web-share-button', 'aria-label="复制出发邀请"')}</header><div class="phone-content" id="screen-content">${state.error && !state.modal ? `<div class="error-banner" role="alert">${icon('info', '', 17)}<span>${e(state.error)}</span></div>` : ''}${renderers[screen](state)}</div>${navigation(state)}${modal(state)}${state.toast ? `<div class="toast" role="status">${icon('check', '', 17)}<span>${e(state.toast)}</span></div>` : ''}</main><span class="desktop-side-note">不必远方<br>也可以出发<span>↗</span></span></div>`;
}
