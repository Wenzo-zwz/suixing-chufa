import test from 'node:test';
import assert from 'node:assert/strict';
import * as gestureModel from '../prototype/gesture-model.mjs';
const {
  flightProgress,
  bowProgress,
  createSwingTracker,
  createScratchTracker,
} = gestureModel;

const origin = { x: 120, y: 160 };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} ≈ ${expected}`);

test('flight needs 65px upward displacement and follows the current position', () => {
  const halfway = flightProgress(origin, { x: 140, y: 127.5 });
  assert.equal(halfway.dx, 20);
  assert.equal(halfway.dy, -32.5);
  near(halfway.progress, 0.5);
  assert.equal(halfway.power, halfway.progress);
  assert.equal(halfway.ready, false);
  assert.equal(flightProgress(origin, { x: 120, y: 96 }).ready, false);
  assert.equal(flightProgress(origin, { x: 120, y: 95 }).ready, true);
  assert.equal(flightProgress(origin, origin).progress, 0);
});

test('flight rejects sideways and downward movement regardless of distance', () => {
  for (const point of [{ x: 900, y: 160 }, { x: 120, y: 900 }, { x: 900, y: 200 }]) {
    const state = flightProgress(origin, point);
    assert.equal(state.progress, 0);
    assert.equal(state.ready, false);
  }
});

test('flight clamps visual displacement, power, progress and angle to finite values', () => {
  const state = flightProgress(origin, { x: 2000, y: -2000 });
  assert.equal(state.dx, 130);
  assert.equal(state.dy, -130);
  assert.equal(state.progress, 1);
  assert.equal(state.power, 1);
  assert.equal(state.ready, true);
  assert.ok(Number.isFinite(state.angle));
  const reverse = flightProgress(origin, { x: -2000, y: 2000 });
  assert.equal(reverse.dx, -130);
  assert.equal(reverse.dy, 130);
});

test('bow needs 45px downward displacement and cancels when pulled back', () => {
  const halfway = bowProgress(origin, { x: 100, y: 182.5 });
  assert.equal(halfway.dx, -20);
  assert.equal(halfway.dy, 22.5);
  near(halfway.progress, 0.5);
  assert.equal(halfway.power, halfway.progress);
  assert.equal(halfway.ready, false);
  assert.equal(bowProgress(origin, { x: 120, y: 204 }).ready, false);
  assert.equal(bowProgress(origin, { x: 120, y: 205 }).ready, true);
  assert.equal(bowProgress(origin, origin).progress, 0);
});

test('bow rejects sideways and upward movement and clamps displacement', () => {
  for (const point of [{ x: 900, y: 160 }, { x: 120, y: -900 }]) {
    const state = bowProgress(origin, point);
    assert.equal(state.progress, 0);
    assert.equal(state.ready, false);
  }
  const state = bowProgress(origin, { x: -2000, y: 2000 });
  assert.equal(state.dx, -130);
  assert.equal(state.dy, 130);
  assert.equal(state.progress, 1);
  assert.equal(state.power, 1);
  assert.ok(Number.isFinite(state.angle));
});

test('drag calculations return finite numbers for invalid coordinates', () => {
  for (const calculate of [flightProgress, bowProgress]) {
    for (const [start, point] of [[origin, { x: NaN, y: Infinity }], [{ x: NaN, y: 0 }, { x: 4, y: 5 }], [null, undefined]]) {
      const state = calculate(start, point);
      for (const key of ['dx', 'dy', 'progress', 'power', 'angle']) assert.ok(Number.isFinite(state[key]), key);
      assert.ok(state.progress >= 0 && state.progress <= 1);
      assert.ok(Math.abs(state.dx) <= 130 && Math.abs(state.dy) <= 130);
    }
  }
});

test('swing counts four alternating half swings beyond the amplitude', () => {
  const tracker = createSwingTracker();
  assert.deepEqual(tracker.push(17, 0), { count: 0, progress: 0, ready: false, accepted: false });
  assert.deepEqual(tracker.push(18, 100), { count: 1, progress: 0.25, ready: false, accepted: true });
  assert.deepEqual(tracker.push(30, 200), { count: 1, progress: 0.25, ready: false, accepted: false });
  assert.equal(tracker.push(-20, 300).count, 2);
  assert.equal(tracker.push(25, 400).count, 3);
  assert.deepEqual(tracker.push(-25, 500), { count: 4, progress: 1, ready: true, accepted: true });
});

test('rapid crossing does not consume the next valid reversal', () => {
  const tracker = createSwingTracker({ minInterval: 100 });
  tracker.push(20, 0);
  assert.equal(tracker.push(-20, 50).accepted, false);
  assert.deepEqual(tracker.push(-20, 100), { count: 2, progress: 0.5, ready: false, accepted: true });
  assert.equal(tracker.push(20, 150).accepted, false);
  assert.equal(tracker.push(20, 200).count, 3);
});

test('swing expires after a gap even if the next sample has the same sign', () => {
  const tracker = createSwingTracker({ maxGap: 500 });
  tracker.push(20, 0);
  tracker.push(-20, 100);
  assert.deepEqual(tracker.push(-20, 601), { count: 1, progress: 0.25, ready: false, accepted: true });
  assert.deepEqual(tracker.push(0, 1200), { count: 0, progress: 0, ready: false, accepted: false });
});

test('swing reset clears direction and timing', () => {
  const tracker = createSwingTracker({ amplitude: 10, required: 2, minInterval: 200 });
  tracker.push(-10, 1000);
  tracker.reset();
  assert.deepEqual(tracker.push(-10, 0), { count: 1, progress: 0.5, ready: false, accepted: true });
  assert.deepEqual(tracker.push(10, 200), { count: 2, progress: 1, ready: true, accepted: true });
});

test('swing ignores invalid and backwards samples without changing the accepted direction', () => {
  const tracker = createSwingTracker();
  tracker.push(20, 100);
  for (const [value, time] of [[NaN, 250], [-20, NaN], [-20, 50], [Infinity, 300]]) {
    assert.deepEqual(tracker.push(value, time), { count: 1, progress: 0.25, ready: false, accepted: false });
  }
  assert.equal(tracker.push(-20, 300).count, 2);
});

test('scratch counts unique cell centers and reports target-normalized progress', () => {
  const tracker = createScratchTracker({ columns: 4, rows: 4, radius: 0.01, target: 0.5 });
  const first = tracker.stroke({ x: 0.125, y: 0.125 }, { x: 0.125, y: 0.125 });
  assert.deepEqual(first, { coverage: 1 / 16, progress: 1 / 8, ready: false });
  assert.deepEqual(tracker.stroke({ x: 0.125, y: 0.125 }, { x: 0.125, y: 0.125 }), first);
  assert.deepEqual(tracker.stroke({ x: 0.125, y: 0.125 }, { x: 0.875, y: 0.125 }), { coverage: 0.25, progress: 0.5, ready: false });
  assert.deepEqual(tracker.stroke({ x: 0.125, y: 0.375 }, { x: 0.875, y: 0.375 }), { coverage: 0.5, progress: 1, ready: true });
});

test('scratch uses the whole segment and reversing a stroke adds no coverage', () => {
  const tracker = createScratchTracker({ columns: 4, rows: 4, radius: 0.01, target: 1 });
  const diagonal = tracker.stroke({ x: 0, y: 0 }, { x: 1, y: 1 });
  assert.deepEqual(diagonal, { coverage: 0.25, progress: 0.25, ready: false });
  assert.deepEqual(tracker.stroke({ x: 1, y: 1 }, { x: 0, y: 0 }), diagonal);
});

test('scratch threshold is 38 percent by default and progress saturates at one', () => {
  const tracker = createScratchTracker({ columns: 10, rows: 10, radius: 0.01 });
  let state;
  for (const y of [0.05, 0.15, 0.25]) state = tracker.stroke({ x: 0, y }, { x: 1, y });
  near(state.coverage, 0.3);
  near(state.progress, 0.3 / 0.38);
  assert.equal(state.ready, false);
  state = tracker.stroke({ x: 0, y: 0.35 }, { x: 1, y: 0.35 });
  assert.deepEqual(state, { coverage: 0.4, progress: 1, ready: true });
});

test('scratch reset clears previous coverage', () => {
  const tracker = createScratchTracker({ columns: 4, rows: 4, radius: 0.01 });
  tracker.stroke({ x: 0, y: 0 }, { x: 1, y: 1 });
  tracker.reset();
  const state = tracker.stroke({ x: 0.125, y: 0.125 }, { x: 0.125, y: 0.125 });
  assert.equal(state.coverage, 1 / 16);
  assert.equal(state.ready, false);
});

test('scratch clips crossing segments and ignores non-finite strokes', () => {
  const tracker = createScratchTracker({ columns: 4, rows: 4, radius: 0.01, target: 1 });
  const state = tracker.stroke({ x: -1, y: 0.125 }, { x: 2, y: 0.125 });
  assert.deepEqual(state, { coverage: 0.25, progress: 0.25, ready: false });
  assert.deepEqual(tracker.stroke({ x: NaN, y: 0 }, { x: 1, y: 1 }), state);
  assert.deepEqual(tracker.stroke(undefined, { x: 1, y: 1 }), state);
});

test('scratch does not project captured pointer movements outside onto the perimeter', () => {
  const tracker = createScratchTracker();
  let previous = { x: 0.5, y: 0.5 };
  const exit = tracker.stroke(previous, { x: 0.5, y: -1 });
  previous = { x: 0.5, y: -1 };
  let state = exit;
  for (const point of [{ x: 2, y: -1 }, { x: 2, y: 2 }, { x: -1, y: 2 }, { x: -1, y: -1 }, previous]) {
    state = tracker.stroke(previous, point);
    previous = point;
  }
  assert.equal(state.coverage, exit.coverage);
  assert.ok(state.coverage < 0.38);
  assert.equal(state.ready, false);
});

test('scratch keeps the actual slope when a segment enters and exits the stage', () => {
  const tracker = createScratchTracker({ columns: 4, rows: 4, radius: 0.01, target: 1 });
  const state = tracker.stroke({ x: -1, y: -0.4375 }, { x: 2, y: 1.0625 });
  assert.deepEqual(state, { coverage: 2 / 16, progress: 2 / 16, ready: false });
});

test('clipScratchStroke rejects invalid points and segments missing the stage', () => {
  for (const [from, to] of [
    [null, { x: 0, y: 0 }],
    [{ x: 0, y: 0 }, undefined],
    [{ x: NaN, y: 0 }, { x: 1, y: 1 }],
    [{ x: 0, y: 0 }, { x: Infinity, y: 1 }],
    [{ x: -1, y: -1 }, { x: 2, y: -1 }],
    [{ x: 2, y: 0 }, { x: 2, y: 1 }],
    [{ x: -1, y: 0.5 }, { x: 0.5, y: -1 }],
    [{ x: -1, y: -1 }, { x: -1, y: -1 }],
  ]) assert.equal(gestureModel.clipScratchStroke(from, to), null);
});

test('clipScratchStroke preserves inside strokes, including a stationary point', () => {
  const from = { x: 0.1, y: 0.2 };
  const to = { x: 0.7, y: 0.9 };
  assert.deepEqual(gestureModel.clipScratchStroke(from, to), { from, to });
  assert.deepEqual(gestureModel.clipScratchStroke(from, from), { from, to: from });
});

test('clipScratchStroke clips entry and exit to the real line in either direction', () => {
  const from = { x: -1, y: 0.125 };
  const to = { x: 2, y: 0.875 };
  assert.deepEqual(gestureModel.clipScratchStroke(from, to), { from: { x: 0, y: 0.375 }, to: { x: 1, y: 0.625 } });
  assert.deepEqual(gestureModel.clipScratchStroke(to, from), { from: { x: 1, y: 0.625 }, to: { x: 0, y: 0.375 } });
  assert.deepEqual(gestureModel.clipScratchStroke({ x: -1, y: 0.25 }, { x: 1, y: 0.75 }), {
    from: { x: 0, y: 0.5 }, to: { x: 1, y: 0.75 },
  });
});

test('clipScratchStroke handles vertical crossings, border strokes and corner contact', () => {
  assert.deepEqual(gestureModel.clipScratchStroke({ x: 0.5, y: -1 }, { x: 0.5, y: 2 }), {
    from: { x: 0.5, y: 0 }, to: { x: 0.5, y: 1 },
  });
  assert.deepEqual(gestureModel.clipScratchStroke({ x: -1, y: 0 }, { x: 2, y: 0 }), {
    from: { x: 0, y: 0 }, to: { x: 1, y: 0 },
  });
  assert.deepEqual(gestureModel.clipScratchStroke({ x: -1, y: 1 }, { x: 1, y: -1 }), {
    from: { x: 0, y: 0 }, to: { x: 0, y: 0 },
  });
});

test('clipScratchStroke keeps finite geometry when a finite coordinate difference overflows', () => {
  assert.deepEqual(gestureModel.clipScratchStroke({ x: -Number.MAX_VALUE, y: 0.5 }, { x: Number.MAX_VALUE, y: 0.5 }), {
    from: { x: 0, y: 0.5 }, to: { x: 1, y: 0.5 },
  });
});
