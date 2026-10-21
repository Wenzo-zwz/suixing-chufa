const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;

function displacement(start, point, axis) {
  return Number.isFinite(start?.[axis]) && Number.isFinite(point?.[axis])
    ? point[axis] - start[axis]
    : 0;
}

function dragProgress(start, point, direction, threshold, maxAngle) {
  const rawX = displacement(start, point, 'x');
  const rawY = displacement(start, point, 'y');
  const dx = clamp(rawX, -130, 130);
  const dy = clamp(rawY, -130, 130);
  const progress = clamp(direction * rawY / threshold);
  return { dx, dy, progress, ready: progress === 1, angle: dx / 130 * maxAngle, power: progress };
}

export const flightProgress = (start, point) => dragProgress(start, point, -1, 65, 25);
export const bowProgress = (start, point) => dragProgress(start, point, 1, 45, 12);

export function createSwingTracker({ amplitude = 18, required = 4, minInterval = 100, maxGap = 1200 } = {}) {
  amplitude = positive(amplitude, 18);
  required = Math.max(1, Math.floor(positive(required, 4)));
  minInterval = Number.isFinite(minInterval) && minInterval >= 0 ? minInterval : 100;
  maxGap = positive(maxGap, 1200);
  let count = 0;
  let lastSign = 0;
  let lastTime = null;

  const state = (accepted = false) => ({ count, progress: clamp(count / required), ready: count >= required, accepted });
  const reset = () => {
    count = 0;
    lastSign = 0;
    lastTime = null;
    return state();
  };

  return {
    push(value, time) {
      if (!Number.isFinite(value) || !Number.isFinite(time)) return state();
      if (lastTime !== null && time < lastTime) return state();
      if (lastTime !== null && time - lastTime > maxGap) reset();
      if (Math.abs(value) < amplitude) return state();
      const sign = Math.sign(value);
      if (sign === lastSign || (lastTime !== null && time - lastTime < minInterval)) return state();
      // Only an accepted crossing changes direction or timing.
      lastSign = sign;
      lastTime = time;
      count = Math.min(required, count + 1);
      return state(true);
    },
    reset,
  };
}

const isFinitePoint = point => Number.isFinite(point?.x) && Number.isFinite(point?.y);
const outsideEdges = point => (point.x < 0 ? 1 : point.x > 1 ? 2 : 0) | (point.y < 0 ? 4 : point.y > 1 ? 8 : 0);

function boundaryFraction(boundary, start, end) {
  const distance = end - start;
  if (Number.isFinite(distance)) return (boundary - start) / distance;
  const scale = Math.max(Math.abs(start), Math.abs(end));
  return (boundary / scale - start / scale) / (end / scale - start / scale);
}

// Cohen–Sutherland clipping keeps the original line instead of projecting
// separate out-of-bounds endpoints onto the stage perimeter.
export function clipScratchStroke(from, to) {
  if (!isFinitePoint(from) || !isFinitePoint(to)) return null;
  from = { x: from.x, y: from.y };
  to = { x: to.x, y: to.y };
  while (true) {
    const fromEdges = outsideEdges(from);
    const toEdges = outsideEdges(to);
    if (!(fromEdges | toEdges)) return { from, to };
    if (fromEdges & toEdges) return null;
    const edges = fromEdges || toEdges;
    let point;
    if (edges & 12) {
      const y = edges & 8 ? 1 : 0;
      const fraction = boundaryFraction(y, from.y, to.y);
      point = { x: (1 - fraction) * from.x + fraction * to.x, y };
    } else {
      const x = edges & 2 ? 1 : 0;
      const fraction = boundaryFraction(x, from.x, to.x);
      point = { x, y: (1 - fraction) * from.y + fraction * to.y };
    }
    if (!isFinitePoint(point)) return null;
    if (fromEdges) from = point;
    else to = point;
  }
}

function squaredDistanceToSegment(point, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  const fraction = length === 0 ? 0 : clamp(((point.x - from.x) * dx + (point.y - from.y) * dy) / length);
  const x = point.x - (from.x + fraction * dx);
  const y = point.y - (from.y + fraction * dy);
  return x * x + y * y;
}

export function createScratchTracker({ columns = 20, rows = 14, radius = 0.085, target = 0.38 } = {}) {
  columns = Math.max(1, Math.floor(positive(columns, 20)));
  rows = Math.max(1, Math.floor(positive(rows, 14)));
  radius = Number.isFinite(radius) && radius >= 0 ? radius : 0.085;
  target = clamp(positive(target, 0.38));
  const scratched = new Set();
  const state = () => {
    const coverage = scratched.size / (columns * rows);
    return { progress: clamp(coverage / target), coverage, ready: coverage >= target };
  };

  return {
    stroke(from, to) {
      const segment = clipScratchStroke(from, to);
      if (!segment) return state();
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const key = row * columns + column;
          if (scratched.has(key)) continue;
          const center = { x: (column + 0.5) / columns, y: (row + 0.5) / rows };
          if (squaredDistanceToSegment(center, segment.from, segment.to) <= radius * radius) scratched.add(key);
        }
      }
      return state();
    },
    reset() {
      scratched.clear();
      return state();
    },
  };
}
