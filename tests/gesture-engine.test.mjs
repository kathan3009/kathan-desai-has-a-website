import test from 'node:test';
import assert from 'node:assert/strict';
import {GestureEngine, scrollVelocity, describeHand} from '../lib/gestures/gesture-engine.ts';
import {ScrollMotion, DwellSelection} from '../lib/gestures/interaction-assist.ts';

function harness() {
  const events = [];
  const engine = new GestureEngine(event => events.push(event));
  let t = 0;
  const sample = (extra = {}, dt = 50) => {
    t += dt;
    engine.update({point: {x: 0.5, y: 0.5}, pose: 'point', pinchRatio: 0.9, ...extra}, t);
  };
  // Opening a pinch has to hold, so re-arming takes a few frames of open hand.
  const arm = () => {
    for (let i = 0; i < 8; i++) sample();
  };
  const count = type => events.filter(event => event.type === type).length;
  return {events, engine, sample, arm, count};
}

test('one pinch produces one down and one up, even across many frames', () => {
  const h = harness();
  h.arm();
  for (let i = 0; i < 20; i++) h.sample({pinchRatio: 0.1});
  for (let i = 0; i < 3; i++) h.sample();
  assert.equal(h.count('down'), 1);
  assert.equal(h.count('up'), 1);
});

test('a light drawing pinch is not lifted by one noisy frame', () => {
  const h = harness();
  h.arm();
  h.sample({pinchRatio: 0.15});
  assert.equal(h.count('down'), 1);
  // A single frame drifting well past the closing threshold must not end it.
  h.sample({pinchRatio: 0.6});
  h.sample({pinchRatio: 0.2});
  for (let i = 0; i < 6; i++) h.sample({pinchRatio: i % 2 ? 0.3 : 0.45});
  assert.equal(h.count('up'), 0);
  assert.equal(h.count('down'), 1);
});

test('a deliberate release still ends the stroke promptly', () => {
  const h = harness();
  h.arm();
  h.sample({pinchRatio: 0.15});
  // One open frame is not yet a release…
  h.sample({pinchRatio: 0.95});
  assert.equal(h.count('up'), 0);
  // …but 100 ms of open hand is, which still reads as immediate.
  h.sample({pinchRatio: 0.95});
  h.sample({pinchRatio: 0.95});
  assert.equal(h.count('up'), 1);
});

test('opening the pinch stops the ink immediately, and ends it where it parted', () => {
  const h = harness();
  h.arm();
  h.sample({pinchRatio: 0.15, point: {x: 0.2, y: 0.2}});
  for (let i = 0; i < 6; i++) h.sample({pinchRatio: 0.15, point: {x: 0.2 + i * 0.05, y: 0.2}});
  const drawn = h.count('move');
  // The fingers part, and the hand keeps travelling for several frames.
  h.sample({pinchRatio: 0.95, point: {x: 0.6, y: 0.2}});
  h.sample({pinchRatio: 0.95, point: {x: 0.9, y: 0.9}});
  assert.equal(h.count('move'), drawn, 'no ink is laid down once the pinch starts opening');
  h.sample({pinchRatio: 0.95, point: {x: 0.9, y: 0.9}});
  const up = h.events.filter(event => event.type === 'up').at(-1);
  assert.ok(up, 'the stroke ends');
  // It ends near where the fingers parted, not where the hand drifted to.
  assert.ok(up.point.x < 0.6, `ended at ${up.point.x}`);
});

test('a hand relaxing out of a pinch does not read as a cancelling fist', () => {
  const h = harness();
  h.arm();
  for (let i = 0; i < 4; i++) h.sample({pinchRatio: 0.15});
  for (let i = 0; i < 3; i++) h.sample({pinchRatio: 0.95});
  // The fingers stay curled for a moment after letting go.
  for (let i = 0; i < 6; i++) h.sample({pose: 'fist'});
  assert.equal(h.events.filter(event => event.reason === 'fist').length, 0);
  // A fist held past that settling window still cancels.
  for (let i = 0; i < 12; i++) h.sample({pose: 'fist'});
  assert.equal(h.events.filter(event => event.reason === 'fist').length, 1);
});

test('tracking loss cancels an active stroke and requires unpinching before resuming', () => {
  const h = harness();
  h.arm();
  h.sample({pinchRatio: 0.1});
  h.engine.update(null, 400);
  h.sample({pinchRatio: 0.1});
  h.sample({pinchRatio: 0.1});
  assert.equal(h.count('cancel'), 1);
  assert.equal(h.count('down'), 1);
  h.arm();
  h.sample({pinchRatio: 0.1});
  assert.equal(h.count('down'), 2);
});

test('open palm opens the menu once per sustained pose', () => {
  const h = harness();
  for (let i = 0; i < 30; i++) h.sample({pose: 'palm'});
  assert.equal(h.count('menu'), 1);
  h.sample();
  for (let i = 0; i < 20; i++) h.sample({pose: 'palm'});
  assert.equal(h.count('menu'), 2);
});

test('scrolling has a neutral region, changes direction, and respects reverse', () => {
  assert.equal(scrollVelocity(0.01), 0);
  assert.ok(scrollVelocity(0.12) > 0);
  assert.ok(scrollVelocity(-0.12) < 0);
  assert.equal(scrollVelocity(0.12, true), -scrollVelocity(0.12));
  assert.equal(scrollVelocity(1), 1000);
});

test('the V sign stabilises before scrolling and ends when fingers lower', () => {
  const h = harness();
  h.sample({pose: 'v'});
  h.sample({pose: 'v'});
  assert.equal(h.count('scrollstart'), 0);
  for (let i = 0; i < 8; i++) h.sample({pose: 'v'});
  for (let i = 0; i < 5; i++) h.sample();
  assert.equal(h.count('scrollstart'), 1);
  assert.ok(h.events.some(event => event.type === 'scrollpause'));
  assert.equal(h.count('scrollend'), 1);
});

test('brief V-sign flicker keeps the original scroll neutral point', () => {
  const h = harness();
  for (let i = 0; i < 8; i++) h.sample({pose: 'v'});
  const origin = h.events.find(event => event.type === 'scrollstart').point;
  h.sample({pose: 'point'});
  h.sample({pose: 'v', point: {x: 0.5, y: 0.65}});
  assert.equal(h.count('scrollstart'), 1);
  assert.equal(h.count('scrollend'), 0);
  assert.deepEqual(h.events.filter(event => event.type === 'scroll').at(-1).origin, origin);
});

test('a second pinch turns a stroke into a transform and blocks new drawing', () => {
  const h = harness();
  h.arm();
  h.sample({pinchRatio: 0.1});
  h.sample({pinchRatio: 0.1, secondary: {pinchRatio: 0.1, point: {x: 0.8, y: 0.5}}});
  assert.equal(h.count('transformstart'), 1);
  assert.equal(h.events.find(event => event.type === 'up').transform, true);
  h.sample({pinchRatio: 0.1});
  h.sample({pinchRatio: 0.1});
  assert.equal(h.count('down'), 1);
});

/** Twenty-one landmarks, laid out so each pose is unambiguous. */
function hand({curl = [], thumbAt = {x: 0.5, y: 0.2}} = {}) {
  const lm = Array.from({length: 21}, () => ({x: 0.5, y: 0.5}));
  lm[0] = {x: 0.5, y: 0.9};
  lm[5] = {x: 0.42, y: 0.6};
  lm[17] = {x: 0.58, y: 0.6};
  [8, 12, 16, 20].forEach((tip, i) => {
    const x = 0.4 + i * 0.06;
    const extended = !curl.includes(i);
    lm[tip - 2] = {x, y: 0.55};
    lm[tip] = {x, y: extended ? 0.25 : 0.62};
  });
  lm[4] = thumbAt;
  return lm;
}

test('the control band matches what a seated hand can actually reach', () => {
  // A hand held comfortably in front of the chest, near the bottom of its reach.
  const low = describeHand(hand({curl: [1, 2, 3]}).map(point => ({...point, y: point.y * 0 + 0.62})));
  assert.ok(low.point.y > 0.9, `low reach maps to ${low.point.y}, which should be near the bottom`);
  const high = describeHand(hand({curl: [1, 2, 3]}).map(point => ({...point, y: 0.08})));
  assert.ok(high.point.y < 0.1, `high reach maps to ${high.point.y}`);
});

test('poses read from landmarks, and the fingertip stays the cursor anchor', () => {
  assert.equal(describeHand(hand()).pose, 'palm');
  assert.equal(describeHand(hand({curl: [0, 1, 2, 3]})).pose, 'fist');
  assert.equal(describeHand(hand({curl: [2, 3]})).pose, 'v');
  assert.equal(describeHand(hand({curl: [1, 2, 3]})).pose, 'point');
  const open = describeHand(hand({curl: [1, 2, 3]}));
  const pinched = describeHand(hand({curl: [1, 2, 3], thumbAt: {x: 0.4, y: 0.26}}));
  assert.ok(pinched.pinchRatio < open.pinchRatio);
  assert.deepEqual(pinched.point, open.point);
});

test('scrolling fills the time between camera samples with gradual motion', () => {
  const motion = new ScrollMotion();
  motion.setTarget(700, 0);
  const a = motion.step(16);
  const b = motion.step(32);
  const c = motion.step(48);
  assert.ok(a > 0 && b > a && c > b);
  assert.ok(c < 700 * 0.016);
});

test('neutral and stale input stop immediately with no momentum', () => {
  const motion = new ScrollMotion();
  motion.setTarget(700, 0);
  motion.step(16);
  motion.setTarget(0, 20);
  assert.equal(motion.step(32), 0);
  motion.setTarget(700, 40);
  assert.equal(motion.step(230), 0);
  assert.equal(motion.target, 0);
});

test('reversal never continues in the old direction', () => {
  const motion = new ScrollMotion();
  motion.setTarget(700, 0);
  motion.step(40);
  motion.setTarget(-700, 50);
  assert.ok(motion.step(66) < 0);
});

test('scroll travel is similar at different camera rates', () => {
  const travel = interval => {
    const motion = new ScrollMotion();
    let total = 0;
    let next = 0;
    for (let t = 0; t <= 1000; t += 10) {
      if (t >= next) {
        motion.setTarget(700, t);
        next += interval;
      }
      total += motion.step(t);
    }
    return total;
  };
  assert.ok(Math.abs(travel(40) - travel(100)) < 1);
});

test('dwell selects once, resets on leaving, and needs a new full hold', () => {
  const dwell = new DwellSelection(700);
  assert.equal(dwell.update('blue', 0, true).activate, false);
  assert.equal(dwell.update('blue', 700, true).activate, true);
  assert.equal(dwell.update('blue', 1500, true).activate, false);
  dwell.update(null, 1600, true);
  assert.equal(dwell.update('blue', 1700, true).activate, false);
  assert.equal(dwell.update('blue', 2400, true).activate, true);
});

test('pinching interrupts a dwell, and a new target cannot inherit progress', () => {
  const dwell = new DwellSelection();
  dwell.update('blue', 0, true);
  dwell.update('blue', 600, true);
  assert.equal(dwell.update('pink', 700, true).progress, 0);
  dwell.update('pink', 800, false);
  assert.equal(dwell.update('pink', 1500, true).activate, false);
});
