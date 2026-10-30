import { flightProgress, bowProgress, createSwingTracker, createScratchTracker, clipScratchStroke } from './gesture-model.mjs?v=0a2b8f5f2546';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const summaries = {
  plane: '你亲手放飞的纸飞机，带来了这一站。',
  dart: '你拉开弓弦，亲手投出了这一站。',
  sticks: '你摇动签筒，给这段旅途抽了一个开头。',
  aroma: '你用指尖拨开的香雾，藏着这一站。'
};

// This controller belongs to one rendered stage. Rendering another view disposes it.
export function mountGameInteractions(stage, { gameId, onCommit, reduceMotion = false }) {
  const events = new AbortController();
  const hint = stage.querySelector('[data-gesture-hint]');
  const meter = stage.querySelector('[data-gesture-progress]');
  const valueLabel = stage.querySelector('[data-gesture-value]');
  const motionButton = stage.parentElement.querySelector('[data-motion-enable]');
  const motionStatus = stage.parentElement.querySelector('[data-motion-status]');
  const initialHint = hint?.textContent || '';
  const swing = createSwingTracker();
  const sensorSwing = createSwingTracker({ amplitude: 4.5 });
  const scratch = createScratchTracker();
  const canvas = stage.querySelector('.aroma-fog');
  const context = canvas?.getContext('2d');
  const size = stage.getBoundingClientRect();
  let pointer = null;
  let disposed = false;
  let committed = false;
  let ready = false;
  let quietTimer;
  let noDataTimer;
  let sensorActive = false;
  let sensorPending = false;
  let sensorGeneration = 0;
  let gravity = null;
  let currentPower = 0;

  const listen = (target, type, handler) => target?.addEventListener(type, handler, { signal: events.signal });
  const say = text => { if (hint && hint.textContent !== text) hint.textContent = text; };
  function progress(amount, text) {
    currentPower = clamp(amount, 0, 1);
    ready = currentPower >= 1;
    const percent = Math.round(currentPower * 100);
    stage.style.setProperty('--power', currentPower);
    meter?.setAttribute('aria-valuenow', percent);
    if (valueLabel) valueLabel.textContent = text || `${percent}%`;
    stage.classList.toggle('is-ready', ready);
  }
  function transform(dx = 0, dy = 0, angle = 0) {
    stage.style.setProperty('--drag-x', `${dx}px`);
    stage.style.setProperty('--drag-y', `${dy}px`);
    stage.style.setProperty('--tilt', `${angle}deg`);
    stage.querySelector('[data-bow-string]')?.setAttribute('d', `M 45 45 L 150 ${82 + Math.max(0, dy) * .6} L 255 45`);
  }
  function paintFog() {
    if (!context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const fog = context.createLinearGradient(0, 0, size.width, size.height);
    fog.addColorStop(0, '#e4ede6'); fog.addColorStop(.5, '#d3e2d8'); fog.addColorStop(1, '#f0e6cf');
    context.fillStyle = fog; context.fillRect(0, 0, size.width, size.height);
    context.fillStyle = '#80998c'; context.textAlign = 'center'; context.font = '13px sans-serif';
    context.fillText('指尖划过，香气显露', size.width / 2, size.height * .48);
  }
  function erase(from, to) {
    const stroke = clipScratchStroke(from, to);
    if (!stroke) return;
    ({ from, to } = stroke);
    if (context) {
      context.save(); context.scale(size.width, size.height);
      context.globalCompositeOperation = 'destination-out';
      context.lineWidth = .17; context.lineCap = 'round'; context.lineJoin = 'round';
      context.beginPath(); context.moveTo(from.x, from.y); context.lineTo(to.x, to.y); context.stroke();
      context.beginPath(); context.arc(to.x, to.y, .085, 0, Math.PI * 2); context.fill(); context.restore();
    }
    const result = scratch.stroke(from, to);
    progress(result.progress);
    say(result.ready ? '香雾已散开，松手遇见下一站' : '慢慢擦开不同的地方，寻找藏着的香气');
  }
  function normalized(point) {
    const rect = stage.getBoundingClientRect();
    return { x: (point.x - rect.left) / rect.width, y: (point.y - rect.top) / rect.height };
  }
  function releaseCapture(id) {
    try { if (stage.hasPointerCapture(id)) stage.releasePointerCapture(id); } catch { /* Already cancelled by browser. */ }
  }
  function reset() {
    const id = pointer?.id;
    pointer = null;
    if (id != null) releaseCapture(id);
    clearTimeout(quietTimer);
    stage.classList.remove('is-dragging', 'is-ready');
    transform(); progress(0); swing.reset(); sensorSwing.reset(); scratch.reset();
    if (gameId === 'aroma') paintFog();
    say(initialHint);
  }
  function status(text) { if (motionStatus) motionStatus.textContent = text; }
  function stopSensor() {
    sensorGeneration++;
    sensorActive = false; sensorPending = false;
    window.removeEventListener('devicemotion', onMotion);
    clearTimeout(quietTimer); clearTimeout(noDataTimer);
    gravity = null;
    if (motionButton) { motionButton.disabled = false; motionButton.textContent = '开启摇一摇'; }
  }
  function commit() {
    if (disposed || committed || document.hidden) return;
    committed = true;
    const power = currentPower;
    pointer = null; stopSensor();
    stage.classList.remove('is-dragging'); stage.classList.add('is-committed');
    say('收到你的出发信号，正在揭晓…');
    onCommit({ gameId, summary: summaries[gameId], power });
  }
  function feedback(point, time) {
    if (!pointer) return;
    if (gameId === 'plane' || gameId === 'dart') {
      const result = (gameId === 'plane' ? flightProgress : bowProgress)(pointer.start, point);
      transform(result.dx, gameId === 'plane' ? Math.min(0, result.dy) : Math.max(0, result.dy), result.angle);
      progress(result.progress);
      say(result.ready ? (gameId === 'plane' ? '可以了，松手让它飞' : '弓已拉开，松手投出这一镖') : (gameId === 'plane' ? '按住向上滑，让飞机跟着手指走' : '继续向下拉，拉回去可以取消'));
    } else if (gameId === 'sticks') {
      const dx = clamp(point.x - pointer.start.x, -60, 60);
      const result = swing.push(dx, time);
      transform(dx, 0, dx / 3);
      progress(result.progress, `${result.count} / 4`);
      say(result.ready ? '好运摇匀了，松手落下一支签' : `左右来回摇一摇，还差 ${4 - result.count} 次`);
    } else if (gameId === 'aroma') {
      erase(normalized(pointer.last), normalized(point));
    }
    pointer.last = point;
  }
  function down(event) {
    if (disposed || committed || pointer || sensorPending || event.isPrimary === false || event.button !== 0 || document.hidden) return;
    if (event.target.closest('button')) return;
    event.preventDefault();
    if (sensorActive) { stopSensor(); sensorSwing.reset(); progress(0); status('已切换为拖动签筒，左右来回即可。'); }
    const point = { x: event.clientX, y: event.clientY };
    pointer = { id: event.pointerId, start: point, last: point };
    if (gameId === 'sticks') { swing.reset(); progress(0); }
    try { stage.setPointerCapture(event.pointerId); } catch { /* Synthetic events have no active hardware pointer. */ }
    stage.classList.add('is-dragging');
    if (gameId === 'aroma') erase(normalized(point), normalized(point));
  }
  function move(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    event.preventDefault();
    feedback({ x: event.clientX, y: event.clientY }, performance.now());
  }
  function up(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    feedback({ x: event.clientX, y: event.clientY }, performance.now());
    const id = pointer.id;
    pointer = null; releaseCapture(id);
    stage.classList.remove('is-dragging');
    if (ready) commit();
    else if (gameId === 'aroma') say('香气留下了，再擦开一点新的地方');
    else { reset(); say(gameId === 'sticks' ? '左右来回摇够 4 次，再松手' : '差一点点，再试一次就好'); }
  }
  function cancel(event) { if (pointer && (event.pointerId == null || event.pointerId === pointer.id)) reset(); }

  function onMotion(event) {
    if (!sensorActive || disposed || committed || document.hidden) return;
    let acceleration = event.acceleration?.x;
    if (!Number.isFinite(acceleration)) {
      const raw = event.accelerationIncludingGravity?.x;
      if (!Number.isFinite(raw)) return;
      gravity = gravity == null ? raw : gravity * .8 + raw * .2;
      acceleration = raw - gravity;
    }
    clearTimeout(noDataTimer);
    const result = sensorSwing.push(acceleration, performance.now());
    progress(result.progress, `${result.count} / 4`);
    transform(clamp(acceleration * 2, -35, 35), 0, clamp(acceleration * 1.5, -20, 20));
    say(result.ready ? '摇好了，停下来让签落下' : `轻轻左右摇动，还差 ${4 - result.count} 次`);
    if (result.ready && Math.abs(acceleration) >= 4.5) {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(() => { if (sensorActive && !document.hidden) commit(); }, 450);
    }
  }
  async function enableMotion() {
    if (disposed || committed) return;
    if (sensorActive || sensorPending) { stopSensor(); reset(); status('也可以按住签筒左右拖动。'); return; }
    if (!window.isSecureContext || typeof window.DeviceMotionEvent === 'undefined') {
      status('这个浏览器暂不支持摇一摇，按住签筒左右拖动也能抽签。'); return;
    }
    reset(); sensorPending = true;
    const generation = ++sensorGeneration;
    motionButton.disabled = true;
    status('正在开启摇一摇…');
    try {
      const permission = typeof window.DeviceMotionEvent.requestPermission === 'function'
        ? await window.DeviceMotionEvent.requestPermission() : 'granted';
      if (disposed || generation !== sensorGeneration || document.hidden) return;
      sensorPending = false; motionButton.disabled = false;
      if (permission !== 'granted') { status('没有开启运动权限，按住签筒左右拖动即可。'); return; }
      sensorActive = true; motionButton.textContent = '关闭摇一摇';
      window.addEventListener('devicemotion', onMotion);
      status('轻轻左右摇动手机，摇够后停下来。也能直接拖动签筒。');
      noDataTimer = setTimeout(() => {
        if (!sensorActive) return;
        stopSensor(); reset(); status('暂未收到手机运动数据，按住签筒左右拖动即可。');
      }, 3500);
    } catch {
      if (disposed || generation !== sensorGeneration) return;
      stopSensor(); status('没能开启摇一摇，按住签筒左右拖动即可。');
    }
  }
  listen(stage, 'pointerdown', down); listen(stage, 'pointermove', move); listen(stage, 'pointerup', up);
  listen(stage, 'pointercancel', cancel); listen(stage, 'lostpointercapture', cancel);
  listen(motionButton, 'click', enableMotion);
  listen(document, 'visibilitychange', () => {
    if (document.hidden) { stopSensor(); reset(); status('回来后可以重新开启摇一摇，也可以拖动签筒。'); }
  });
  stage.dataset.interactive = 'true';
  stage.classList.toggle('simplify-gesture-motion', reduceMotion);
  if (canvas) paintFog();
  return () => {
    disposed = true; stopSensor(); events.abort();
    if (pointer) releaseCapture(pointer.id);
    pointer = null;
  };
}
