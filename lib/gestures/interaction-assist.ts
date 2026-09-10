/** Frame-rate independent scrolling. Input updates need not match display frames. */
export class ScrollMotion {
  target = 0;
  velocity = 0;
  inputAt = -Infinity;
  frameAt: number | null = null;

  constructor() {
    this.stop();
  }

  stop() {
    this.target = 0;
    this.velocity = 0;
    this.inputAt = -Infinity;
    this.frameAt = null;
  }

  setTarget(speed: number, now: number) {
    if (!speed) {
      this.stop();
      return;
    }
    // No residual motion in the old direction when the user reverses.
    if (Math.sign(speed) !== Math.sign(this.target)) this.velocity = 0;
    this.target = speed;
    this.inputAt = now;
    this.frameAt ??= now;
  }

  step(now: number) {
    if (!this.target || now - this.inputAt > 180) {
      this.stop();
      return 0;
    }
    const dt = Math.max(0, Math.min((now - (this.frameAt as number)) / 1000, 0.05));
    this.frameAt = now;
    this.velocity += (this.target - this.velocity) * (1 - Math.exp(-dt / 0.1));
    return this.velocity * dt;
  }
}

/** Dwell is allowed only for explicitly registered, reversible choices. */
export class DwellSelection {
  duration: number;
  target: Element | null = null;
  since = 0;
  consumed = false;

  constructor(duration = 700) {
    this.duration = duration;
    this.reset();
  }

  reset() {
    this.target = null;
    this.since = 0;
    this.consumed = false;
  }

  update(target: Element | null, time: number, eligible: boolean) {
    if (!eligible || !target) {
      this.reset();
      return {progress: 0, activate: false};
    }
    if (target !== this.target) {
      this.target = target;
      this.since = time;
      this.consumed = false;
    }
    const progress = Math.max(0, Math.min(1, (time - this.since) / this.duration));
    const activate = progress === 1 && !this.consumed;
    if (activate) this.consumed = true;
    return {progress, activate};
  }
}
