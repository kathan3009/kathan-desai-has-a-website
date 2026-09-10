/** Local-only capture. A single transferable frame is in flight; no frame history. */

export type TrackerState = 'loading' | 'requesting' | 'running' | 'off';

export type HandResult = {
  landmarks?: {x: number; y: number; z?: number}[][];
  handedness?: {categoryName: string}[][];
  aspect: number;
};

const MESSAGES: Record<string, string> = {
  NotAllowedError: 'Camera access was blocked. Allow it in your browser settings, then try again.',
  NotFoundError: 'No camera found. You can still use the site normally.',
  NotReadableError: 'The camera is busy in another app. Close it and try again.',
  SecurityError: 'Camera access needs a secure connection.',
};

export class CameraTracker {
  video: HTMLVideoElement;
  assetBase: string;
  onResult: (result: HandResult) => void;
  onState: (state: TrackerState, message?: string) => void;
  running = false;
  starting = false;
  generation = 0;
  busy = false;
  stream: MediaStream | null = null;
  worker: Worker | null = null;
  cancelReady: (() => void) | null = null;
  frame = 0;
  frameTimeout: ReturnType<typeof setTimeout> | undefined;
  lastVideoTime = -1;
  lastFrame = 0;
  /** Rolling round-trip cost, so slower machines are sampled less often. */
  cost = 40;
  sentAt = 0;

  constructor(
    video: HTMLVideoElement,
    assetBase: string,
    onResult: (result: HandResult) => void,
    onState: (state: TrackerState, message?: string) => void,
  ) {
    this.video = video;
    this.assetBase = assetBase;
    this.onResult = onResult;
    this.onState = onState;
  }

  async start() {
    if (this.running || this.starting) return;
    const generation = ++this.generation;
    this.starting = true;
    this.onState('loading', 'Loading hand tracking on this device…');
    let worker: Worker;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext)
        throw new Error('Camera access needs HTTPS or localhost in a supported browser.');
      if (typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined')
        throw new Error('This browser cannot run hand tracking. Try a recent Chrome, Edge, or Safari.');
      worker = this.worker = new Worker(`${this.assetBase}tracking-worker.js`);
      const ready = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('The hand model took too long to load. Try again.')), 30000);
        this.cancelReady = () => {
          clearTimeout(timer);
          reject(new Error('Camera cancelled.'));
        };
        worker.onmessage = ({data}) => {
          if (data.type === 'ready') {
            clearTimeout(timer);
            resolve();
          }
          if (data.type === 'error') {
            clearTimeout(timer);
            reject(new Error(data.message));
          }
        };
        worker.onerror = () => {
          clearTimeout(timer);
          reject(new Error('Hand tracking could not start. The model files may be unavailable.'));
        };
      });
      worker.postMessage({type: 'init', base: new URL(this.assetBase, location.href).href});
      await ready;
      if (generation !== this.generation) return;
      this.cancelReady = null;
      this.onState('requesting', 'Allow camera access to start. The microphone is never requested.');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {facingMode: 'user', width: {ideal: 640}, height: {ideal: 480}, frameRate: {ideal: 30, max: 30}},
      });
      // A permission dialog answered after cancelling still hands back a live stream.
      if (generation !== this.generation) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      this.stream = stream;
      this.video.srcObject = stream;
      await this.video.play();
      if (generation !== this.generation) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      this.running = true;
      this.starting = false;
      this.busy = false;
      this.lastVideoTime = -1;
      this.lastFrame = 0;
      this.onState('running');
      stream.getVideoTracks().forEach(track =>
        track.addEventListener('ended', () => {
          if (this.running && generation === this.generation) this.stop('Camera access ended. Turn hand controls on to try again.');
        }),
      );
      worker.onmessage = ({data}) => {
        if (generation !== this.generation) return;
        this.busy = false;
        clearTimeout(this.frameTimeout);
        if (data.type === 'result') {
          this.cost += (performance.now() - this.sentAt - this.cost) * 0.2;
          this.onResult(data.result);
        }
        if (data.type === 'error') this.stop(data.message);
      };
      worker.onerror = () => this.stop('Hand tracking stopped unexpectedly. Turn it on again to retry.');
      const loop = async (now: number) => {
        if (!this.running || generation !== this.generation) return;
        this.frame = requestAnimationFrame(loop);
        const interval = Math.max(40, Math.min(80, this.cost * 1.25));
        if (this.busy || now - this.lastFrame < interval || this.video.readyState < 2 || this.video.currentTime === this.lastVideoTime)
          return;
        this.busy = true;
        this.lastFrame = now;
        this.lastVideoTime = this.video.currentTime;
        try {
          const bitmap = await createImageBitmap(this.video);
          if (!this.running || generation !== this.generation) {
            bitmap.close();
            return;
          }
          this.sentAt = performance.now();
          this.frameTimeout = setTimeout(() => this.stop('Hand tracking stopped responding. Turn it on again to retry.'), 5000);
          worker.postMessage({type: 'frame', bitmap, timestamp: now}, [bitmap]);
        } catch {
          if (generation === this.generation) this.stop('Could not read camera frames. Try turning hand controls on again.');
        }
      };
      this.frame = requestAnimationFrame(loop);
    } catch (error) {
      if (generation !== this.generation) return;
      const named = error as {name?: string; message: string};
      this.stop(MESSAGES[named.name || ''] || named.message);
    }
  }

  stop(message?: string) {
    this.generation++;
    this.running = false;
    this.starting = false;
    this.cancelReady?.();
    this.cancelReady = null;
    cancelAnimationFrame(this.frame);
    clearTimeout(this.frameTimeout);
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    try {
      this.video.pause();
    } catch {
      /* The element may already be detached. */
    }
    this.video.srcObject = null;
    this.worker?.terminate();
    this.worker = null;
    this.busy = false;
    this.onState('off', message);
  }
}
