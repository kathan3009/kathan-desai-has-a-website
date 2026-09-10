/** Pure gesture state machine. No DOM, camera, storage, or framework dependencies. */

export type Point = {x: number; y: number};
export type Pose = 'point' | 'palm' | 'fist' | 'v' | 'pinch' | '';

export type GestureSample = {
  point: Point;
  scrollPoint?: Point;
  pinchRatio: number;
  pose: Pose;
  secondary?: {point: Point; pinchRatio: number} | null;
};

export type GestureEvent =
  | {type: 'pointer'; point: Point; pose: Pose; selecting: boolean}
  | {type: 'down'; point: Point}
  | {type: 'move'; point: Point}
  | {type: 'up'; point: Point; transform?: boolean}
  | {type: 'cancel'; reason?: string}
  | {type: 'menu'}
  | {type: 'lost'}
  | {type: 'scrollstart'; point: Point; anchor: Point}
  | {type: 'scroll'; point: Point; anchor: Point; origin: Point; displacement: number; dt: number}
  | {type: 'scrollpause'}
  | {type: 'scrollend'}
  | {type: 'transformstart'; center: Point; distance: number}
  | {type: 'transform'; center: Point; distance: number}
  | {type: 'transformend'};

export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/** Pinch thresholds, as a fraction of palm width. */
const PINCH_CLOSE = 0.28;
const PINCH_OPEN = 0.46;
const PINCH_RELEASE_HOLD = 60;
/** A hand relaxing out of a pinch curls, and briefly looks exactly like a fist. */
const FIST_AFTER_PINCH = 400;

export function scrollVelocity(displacement: number, reversed = false) {
  const distance = Math.abs(displacement);
  if (distance < 0.035) return 0;
  return Math.sign(displacement) * Math.pow(clamp((distance - 0.035) / 0.22, 0, 1), 1.4) * 1000 * (reversed ? -1 : 1);
}

export class GestureEngine {
  emit: (event: GestureEvent) => void;
  state: 'idle' | 'pinch' | 'scroll' | 'transform' = 'idle';
  armed = false;
  releaseSince: number | null = null;
  openingSince: number | null = null;
  /** Where the hand was when the pinch began to open. */
  holdPoint: Point | null = null;
  pinchEndedAt = 0;
  pose: Pose = '';
  poseSince = 0;
  latchedPose: Pose = '';
  previous: number | null = null;
  point: Point | null = null;
  scrollPoint: Point | null = null;
  scrollExitSince: number | null = null;
  pinch = false;
  secondPinch = false;
  origin: Point = {x: 0, y: 0};

  constructor(emit: (event: GestureEvent) => void) {
    this.emit = emit;
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.armed = false;
    this.releaseSince = null;
    this.openingSince = null;
    this.holdPoint = null;
    this.pinchEndedAt = 0;
    this.pose = '';
    this.poseSince = 0;
    this.latchedPose = '';
    this.previous = null;
    this.point = null;
    this.scrollPoint = null;
    this.scrollExitSince = null;
    this.pinch = false;
    this.secondPinch = false;
  }

  cancel() {
    if (this.state !== 'idle') this.emit({type: 'cancel', reason: 'interrupted'});
    this.reset();
  }

  update(sample: GestureSample | null, time: number) {
    if (!sample) {
      this.cancel();
      this.emit({type: 'lost'});
      return;
    }
    const dt = this.previous === null ? 1 / 30 : clamp((time - this.previous) / 1000, 0, 0.08);
    this.previous = time;
    const raw = sample.point;
    const speed = this.point ? Math.hypot(raw.x - this.point.x, raw.y - this.point.y) / Math.max(dt, 0.01) : 0;
    const alpha = 1 - Math.exp(-dt * (9 + Math.min(32, speed * 18)));
    this.point = this.point
      ? {x: this.point.x + (raw.x - this.point.x) * alpha, y: this.point.y + (raw.y - this.point.y) * alpha}
      : {...raw};
    const point = {...this.point};
    const rawScroll = sample.scrollPoint || raw;
    const scrollAlpha = 1 - Math.exp(-dt * 12);
    this.scrollPoint = this.scrollPoint
      ? {x: this.scrollPoint.x + (rawScroll.x - this.scrollPoint.x) * scrollAlpha, y: this.scrollPoint.y + (rawScroll.y - this.scrollPoint.y) * scrollAlpha}
      : {...rawScroll};
    // Closing is immediate; opening has to hold, so a noisy frame mid-stroke
    // does not lift the brush and drop the whole interaction.
    const closed = sample.pinchRatio < (this.pinch ? PINCH_OPEN : PINCH_CLOSE);
    if (this.pinch && !closed) {
      if (this.openingSince === null) {
        this.openingSince = time;
        this.holdPoint = {...this.point};
      }
      if (time - this.openingSince >= PINCH_RELEASE_HOLD) {
        this.pinch = false;
        this.pinchEndedAt = time;
      }
    } else {
      this.openingSince = null;
      this.pinch = closed;
    }
    this.secondPinch = !!sample.secondary && sample.secondary.pinchRatio < (this.secondPinch ? PINCH_OPEN : PINCH_CLOSE);
    if (!this.pinch) {
      this.releaseSince ??= time;
      if (time - this.releaseSince >= 140) this.armed = true;
    } else this.releaseSince = null;
    const pose: Pose = this.pinch ? 'pinch' : sample.pose;
    this.emit({type: 'pointer', point, pose, selecting: this.state === 'idle' && pose === 'point'});
    if (pose !== this.pose) {
      this.pose = pose;
      this.poseSince = time;
      this.latchedPose = '';
    }
    const held = time - this.poseSince;
    const relaxing = pose === 'fist' && time - this.pinchEndedAt < FIST_AFTER_PINCH;
    if (!relaxing && ((pose === 'palm' && held >= 650) || (pose === 'fist' && held >= 450))) {
      if (this.latchedPose !== pose) {
        if (this.state !== 'idle') this.emit({type: 'cancel'});
        this.state = 'idle';
        this.armed = false;
        this.latchedPose = pose;
        if (pose === 'palm') this.emit({type: 'menu'});
        else this.emit({type: 'cancel', reason: 'fist'});
      }
      return;
    }
    if (this.state === 'transform') {
      if (!this.pinch || !this.secondPinch) {
        this.emit({type: 'transformend'});
        this.state = 'idle';
        this.armed = false;
      } else {
        const b = sample.secondary!.point;
        this.emit({
          type: 'transform',
          center: {x: (point.x + b.x) / 2, y: (point.y + b.y) / 2},
          distance: Math.hypot(point.x - b.x, point.y - b.y),
        });
      }
      return;
    }
    if (this.pinch && this.secondPinch && (this.armed || this.state === 'pinch')) {
      if (this.state === 'pinch') this.emit({type: 'up', point, transform: true});
      if (this.state === 'scroll') this.emit({type: 'scrollend'});
      this.state = 'transform';
      this.armed = false;
      const b = sample.secondary!.point;
      this.emit({
        type: 'transformstart',
        center: {x: (point.x + b.x) / 2, y: (point.y + b.y) / 2},
        distance: Math.max(0.03, Math.hypot(point.x - b.x, point.y - b.y)),
      });
      return;
    }
    if (this.state === 'pinch') {
      // No ink while the pinch might be ending: a release should stop the line
      // where the fingers parted, not where the hand travelled afterwards.
      if (this.pinch) {
        if (this.openingSince === null) this.emit({type: 'move', point});
      } else {
        this.emit({type: 'up', point: this.holdPoint || point});
        this.holdPoint = null;
        this.state = 'idle';
      }
      return;
    }
    if (this.state === 'scroll') {
      if (pose !== 'v') {
        this.scrollExitSince ??= time;
        this.emit({type: 'scrollpause'});
        if (time - this.scrollExitSince >= 180 || pose === 'pinch') {
          this.state = 'idle';
          this.scrollExitSince = null;
          this.emit({type: 'scrollend'});
        }
      } else {
        this.scrollExitSince = null;
        this.emit({
          type: 'scroll',
          point,
          anchor: {...this.scrollPoint},
          origin: this.origin,
          displacement: this.scrollPoint.y - this.origin.y,
          dt,
        });
      }
      return;
    }
    if (pose === 'v' && held >= 250) {
      this.state = 'scroll';
      this.scrollExitSince = null;
      this.origin = {...this.scrollPoint};
      this.emit({type: 'scrollstart', point, anchor: {...this.scrollPoint}});
    } else if (this.pinch && this.armed) {
      this.state = 'pinch';
      this.armed = false;
      this.emit({type: 'down', point});
    }
  }
}

export type Landmark = {x: number; y: number; z?: number};

const dist = (a: Landmark, b: Landmark, aspect: number) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);

/** Coordinates mirror the camera; a central control area gives comfortable reach. */
export function describeHand(lm: Landmark[], aspect = 4 / 3) {
  const palm = Math.max(0.025, dist(lm[5], lm[17], aspect));
  const pinchRatio = dist(lm[4], lm[8], aspect) / palm;
  const extended = [8, 12, 16, 20].map(tip => dist(lm[tip], lm[0], aspect) > dist(lm[tip - 2], lm[0], aspect) * 1.23);
  const [index, middle, ring, pinky] = extended;
  const pose: Pose = extended.every(Boolean)
    ? 'palm'
    : !extended.some(Boolean)
      ? 'fist'
      : index && middle && !ring && !pinky
        ? 'v'
        : 'point';
  // Never switch the cursor anchor during a pinch: that creates target jumps.
  const map = (p: Landmark) => ({x: clamp((1 - p.x - 0.1) / 0.8, 0, 1), y: clamp((p.y - 0.06) / 0.6, 0, 1)});
  const palmCenter = [0, 5, 9, 13, 17].reduce((p, i) => ({x: p.x + lm[i].x / 5, y: p.y + lm[i].y / 5}), {x: 0, y: 0});
  return {point: map(lm[8]), scrollPoint: map(palmCenter), pinchRatio, pose, wrist: lm[0]};
}
