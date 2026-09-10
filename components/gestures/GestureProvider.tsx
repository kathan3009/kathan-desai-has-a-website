"use client";

/**
 * One camera session, one worker, one gesture engine, one cursor, for the whole
 * site. Browse mode drives ordinary links and buttons; /paint borrows the same
 * session by registering a drawing surface. Nothing starts until someone asks.
 */

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {GestureEngine, describeHand, clamp, scrollVelocity, type GestureEvent, type Point} from '@/lib/gestures/gesture-engine';
import {ScrollMotion, DwellSelection} from '@/lib/gestures/interaction-assist';
import {CameraTracker, type HandResult, type TrackerState} from '@/lib/gestures/camera';
import {
  DEFAULT_PREFERENCES,
  GESTURE_ASSET_BASE,
  SCROLL_SPEEDS,
  readPreferences,
  writePreferences,
  type GesturePreferences,
} from '@/lib/gestures/preferences';
import styles from './gestures.module.css';

export type GestureStatus = 'off' | 'loading' | 'requesting' | 'tracking' | 'paused' | 'error';
export type GestureMode = 'browse' | 'paint';

/** Paint registers this so the shared engine can draw without a second tracker. */
export type GestureSurface = {
  contains(point: Point): boolean;
  begin(point: Point): void;
  move(point: Point): void;
  end(cancelled: boolean): void;
  pan(delta: Point, phase: 'start' | 'move' | 'end'): void;
  zoom(scale: number, delta: Point, phase: 'start' | 'move' | 'end'): void;
  /** Open palm inside Paint reaches the drawing tools rather than the site guide. */
  menu(): boolean;
  cancel(): void;
  /** Eraser shows its true footprint; anything else uses the default ring. */
  footprint(point: Point): number | null;
  /**
   * The rectangle the hand's reach maps onto. Paint hands back the paper, or
   * the open tool sheet, so the whole surface is reachable rather than a band
   * in the middle of the page. Null means the whole viewport.
   */
  region(): {left: number; top: number; width: number; height: number} | null;
};

type GestureContextValue = {
  enabled: boolean;
  /** False on the editing surfaces, where hand control is never offered. */
  available: boolean;
  status: GestureStatus;
  mode: GestureMode;
  message: string;
  pose: string;
  guideOpen: boolean;
  supported: boolean;
  preferences: GesturePreferences;
  enable(): Promise<void>;
  disable(): void;
  resume(): Promise<void>;
  openGuide(): void;
  minimizeGuide(): void;
  dismissError(): void;
  setPreferences(next: Partial<GesturePreferences>): void;
  registerSurface(surface: GestureSurface | null): void;
  registerHandFrames(listener: ((result: HandResult | null) => void) | null): void;
  videoElement(): HTMLVideoElement | null;
};

const noop = () => {};

const GestureContext = createContext<GestureContextValue>({
  enabled: false,
  available: false,
  status: 'off',
  mode: 'browse',
  message: '',
  pose: '',
  guideOpen: false,
  supported: false,
  preferences: DEFAULT_PREFERENCES,
  enable: async () => {},
  disable: noop,
  resume: async () => {},
  openGuide: noop,
  minimizeGuide: noop,
  dismissError: noop,
  setPreferences: noop,
  registerSurface: noop,
  registerHandFrames: noop,
  videoElement: () => null,
});

export const useGestures = () => useContext(GestureContext);

/**
 * Only real, semantic controls inside a declared gesture scope can be reached.
 * Arbitrary page nodes are never clicked.
 */
const TARGETS = 'a[href], button, summary, [role="button"], input[type="checkbox"], input[type="radio"], [data-gesture-target]';
const SCOPE = '[data-gesture-scope]';

const ADMIN_PATHS = ['/admin', `/${process.env.NEXT_PUBLIC_ADMIN_PATH || 'admin'}`];

const isAdminRoute = (path: string) => ADMIN_PATHS.some(prefix => path === prefix || path.startsWith(`${prefix}/`));

const SKELETON = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11],
  [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
] as const;

export const HAND_SKELETON = SKELETON;

/** How long a hand may vanish from the model before it counts as gone. */
const HAND_GRACE = 260;

const usable = (el: Element | null | undefined): el is HTMLElement => {
  if (!el || !(el instanceof HTMLElement) || !el.isConnected) return false;
  if (el.matches('[disabled], [aria-disabled="true"], [data-gesture-ignore]')) return false;
  if (el.closest('[data-gesture-ignore]')) return false;
  return !!el.closest(SCOPE) && el.getClientRects().length > 0;
};

const nearTarget = (el: HTMLElement | null, p: Point, padding: number) => {
  if (!usable(el)) return false;
  const r = el.getBoundingClientRect();
  return p.x >= r.left - padding && p.x <= r.right + padding && p.y >= r.top - padding && p.y <= r.bottom + padding;
};

/** A lightbox or an open tool sheet owns the pointer while it is up. */
const activeLayer = () => document.querySelector('dialog[open], [data-gesture-sheet]');

function hitTarget(p: Point, held: HTMLElement | null = null, assisted = false): HTMLElement | null {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  const layer = activeLayer();
  const direct = document.elementFromPoint(p.x, p.y)?.closest(TARGETS);
  if (usable(direct) && (!layer || layer.contains(direct))) return direct;
  // A little hysteresis around the highlighted target, never across another one.
  if (assisted && !direct && nearTarget(held, p, 14) && (!layer || layer.contains(held))) return held;
  return null;
}

export default function GestureProvider({children}: {children: React.ReactNode}) {
  const pathname = usePathname() || '/';
  const admin = isAdminRoute(pathname);
  const mode: GestureMode = pathname === '/paint' ? 'paint' : 'browse';

  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<GestureStatus>('off');
  const [message, setMessage] = useState('');
  const [pose, setPose] = useState('');
  const [guideOpen, setGuideOpen] = useState(true);
  const [supported, setSupported] = useState(false);
  const [preferences, setPreferencesState] = useState<GesturePreferences>(DEFAULT_PREFERENCES);

  // Per-frame values live in refs: camera input must never rerender the tree.
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackerRef = useRef<CameraTracker | null>(null);
  const engineRef = useRef<GestureEngine | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLSpanElement | null>(null);
  const scrollTipRef = useRef<HTMLDivElement | null>(null);
  const scrollMotion = useRef(new ScrollMotion());
  const dwell = useRef(new DwellSelection(700));
  const surfaceRef = useRef<GestureSurface | null>(null);
  const framesRef = useRef<((result: HandResult | null) => void) | null>(null);
  const preferencesRef = useRef(preferences);
  const modeRef = useRef(mode);
  const enabledRef = useRef(false);
  const pausingRef = useRef(false);
  const teardownRef = useRef(false);

  const hovered = useRef<HTMLElement | null>(null);
  const dwellTarget = useRef<HTMLElement | null>(null);
  const interaction = useRef<{type: 'target' | 'draw' | 'empty'; target?: HTMLElement} | null>(null);
  const transform = useRef<{node: HTMLElement | null; distance: number; center: Point; zoom: number; x: number; y: number} | null>(null);
  const panning = useRef(false);
  const scrollFrame = useRef(0);
  const scrollNode = useRef<HTMLElement | null>(null);
  const pointerFrame = useRef(0);
  const shown = useRef<Point | null>(null);
  const wanted = useRef<Point | null>(null);
  const pointerAt = useRef(0);
  const manualUntil = useRef(0);
  const lastSampleAt = useRef(0);
  const lastWrist = useRef<{x: number; y: number} | null>(null);
  const missingSince = useRef(0);
  const poseRef = useRef('');
  const mouseDown = useRef(false);
  const regionKey = useRef('');

  preferencesRef.current = preferences;
  modeRef.current = mode;

  useEffect(() => {
    setPreferencesState(readPreferences());
    setSupported(
      typeof window !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof Worker !== 'undefined' &&
        typeof createImageBitmap !== 'undefined' &&
        window.isSecureContext,
    );
  }, []);

  /* ── cursor ──────────────────────────────────────────────────────────── */

  const cursorHost = useCallback(() => {
    // A native dialog lives in the top layer; a high z-index sibling cannot reach it.
    const dialog = document.querySelector('dialog[open]');
    return (dialog as HTMLElement) || document.body;
  }, []);

  const ensureCursor = useCallback(() => {
    if (!cursorRef.current) {
      const node = document.createElement('div');
      node.className = styles.cursor;
      node.setAttribute('aria-hidden', 'true');
      const hint = document.createElement('span');
      hint.className = styles.cursorHint;
      node.append(hint);
      cursorRef.current = node;
      hintRef.current = hint;
    }
    const host = cursorHost();
    if (cursorRef.current.parentElement !== host) host.append(cursorRef.current);
    return cursorRef.current;
  }, [cursorHost]);

  const hideCursor = useCallback(() => {
    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = 0;
    shown.current = null;
    wanted.current = null;
    if (cursorRef.current) {
      cursorRef.current.hidden = true;
      cursorRef.current.classList.remove(styles.pinched);
    }
  }, []);

  const animateCursor = useCallback(function step(now: number) {
    pointerFrame.current = 0;
    const node = cursorRef.current;
    if (!node || node.hidden || !wanted.current || !shown.current) return;
    const dt = clamp((now - pointerAt.current) / 1000, 0, 0.05);
    pointerAt.current = now;
    const a = 1 - Math.exp(-dt * 45);
    shown.current.x += (wanted.current.x - shown.current.x) * a;
    shown.current.y += (wanted.current.y - shown.current.y) * a;
    node.style.transform = `translate(${shown.current.x}px, ${shown.current.y}px)`;
    if (Math.hypot(wanted.current.x - shown.current.x, wanted.current.y - shown.current.y) > 0.3)
      pointerFrame.current = requestAnimationFrame(step);
  }, []);

  const moveCursor = useCallback(
    (p: Point) => {
      const node = ensureCursor();
      node.hidden = false;
      wanted.current = p;
      if (!shown.current) {
        shown.current = {...p};
        node.style.transform = `translate(${p.x}px, ${p.y}px)`;
      }
      if (!pointerFrame.current) {
        pointerAt.current = performance.now();
        pointerFrame.current = requestAnimationFrame(animateCursor);
      }
      // Skip the hit test mid-stroke: it forces layout on every camera frame.
      const drawing = interaction.current?.type === 'draw';
      const footprint = surfaceRef.current && (drawing || !hitTarget(p)) ? surfaceRef.current.footprint(p) : null;
      node.style.setProperty('--gesture-cursor-size', `${footprint ?? 28}px`);
      node.classList.toggle(styles.footprint, footprint !== null);
    },
    [animateCursor, ensureCursor],
  );

  /* ── targets ─────────────────────────────────────────────────────────── */

  const clearHover = useCallback(() => {
    hovered.current?.classList.remove(styles.hover);
    hovered.current = null;
  }, []);

  const hover = useCallback(
    (p: Point) => {
      const next = hitTarget(p, hovered.current, true);
      if (next === hovered.current) return;
      clearHover();
      if (next) {
        hovered.current = next;
        next.classList.add(styles.hover);
      }
    },
    [clearHover],
  );

  const resetDwell = useCallback(() => {
    dwell.current.reset();
    dwellTarget.current?.classList.remove(styles.dwelling);
    dwellTarget.current = null;
    cursorRef.current?.style.setProperty('--gesture-dwell', '0deg');
    if (hintRef.current) hintRef.current.textContent = '';
  }, []);

  /* ── scrolling ───────────────────────────────────────────────────────── */

  const stopScroll = useCallback(() => {
    cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = 0;
    scrollMotion.current.stop();
    if (scrollNode.current) {
      scrollNode.current.style.scrollBehavior = '';
      scrollNode.current = null;
    }
    if (scrollTipRef.current) scrollTipRef.current.hidden = true;
  }, []);

  /** Modal first, then a registered container, then the page. Never behind a modal. */
  const scrollSurface = useCallback((): HTMLElement | null => {
    const scrollable = (el: Element | null) => !!el && el.scrollHeight > el.clientHeight + 1;
    const layer = activeLayer();
    if (layer) {
      if (scrollable(layer)) return layer as HTMLElement;
      const inner = [...layer.querySelectorAll<HTMLElement>('[data-gesture-scroll], *')].find(
        el => scrollable(el) && /auto|scroll/.test(getComputedStyle(el).overflowY),
      );
      return inner || null;
    }
    const registered = document.querySelector<HTMLElement>('[data-gesture-scroll]');
    if (scrollable(registered)) return registered;
    return (document.scrollingElement as HTMLElement) || document.documentElement;
  }, []);

  const animateScroll = useCallback(
    function step(now: number) {
      scrollFrame.current = 0;
      const surface = scrollNode.current;
      if (!surface || mouseDown.current) {
        stopScroll();
        return;
      }
      const delta = scrollMotion.current.step(now);
      if (delta) surface.scrollTop += delta;
      if (scrollMotion.current.target) scrollFrame.current = requestAnimationFrame(step);
    },
    [stopScroll],
  );

  /* ── interactions ────────────────────────────────────────────────────── */

  const endInteraction = useCallback((cancelled: boolean, p: Point | null = null) => {
    const current = interaction.current;
    interaction.current = null;
    if (!current) return;
    current.target?.classList.remove(styles.pressed);
    if (current.type === 'draw') surfaceRef.current?.end(cancelled);
    if (current.type === 'target' && !cancelled && p && current.target) {
      const direct = hitTarget(p);
      // Releasing over a different control must never fire the original one.
      const allowed = direct === current.target || (!direct && nearTarget(current.target, p, 28));
      if (allowed) current.target.click();
    }
  }, []);

  const startInteraction = useCallback(
    (p: Point) => {
      if (interaction.current) return;
      resetDwell();
      const target = hitTarget(p, hovered.current, true);
      if (target) {
        interaction.current = {type: 'target', target};
        target.classList.add(styles.pressed);
      } else if (surfaceRef.current?.contains(p)) {
        interaction.current = {type: 'draw'};
        surfaceRef.current.begin(p);
      } else interaction.current = {type: 'empty'};
    },
    [resetDwell],
  );

  const releaseAll = useCallback(
    () => {
      stopScroll();
      resetDwell();
      endInteraction(true);
      clearHover();
      if (transform.current) {
        surfaceRef.current?.zoom(1, {x: 0, y: 0}, 'end');
        transform.current = null;
      }
      if (panning.current) {
        surfaceRef.current?.pan({x: 0, y: 0}, 'end');
        panning.current = false;
      }
      cursorRef.current?.classList.remove(styles.pinched);
    },
    [clearHover, endInteraction, resetDwell, stopScroll],
  );

  /* ── gesture events ──────────────────────────────────────────────────── */

  const handleGesture = useCallback(
    (event: GestureEvent) => {
      if (mouseDown.current) return;
      // Reach maps onto whatever owns input: the paper, the open tool sheet, or
      // the page. Switching between them snaps the cursor instead of sliding.
      const region = modeRef.current === 'paint' ? surfaceRef.current?.region() ?? null : null;
      const key = region ? `${Math.round(region.left)}:${Math.round(region.top)}:${Math.round(region.width)}:${Math.round(region.height)}` : '';
      if (key !== regionKey.current) {
        regionKey.current = key;
        shown.current = null;
      }
      const px = (point: Point) =>
        region
          ? {x: region.left + point.x * region.width, y: region.top + point.y * region.height}
          : {x: point.x * window.innerWidth, y: point.y * window.innerHeight};

      if (event.type === 'pointer') {
        const p = px(event.point);
        moveCursor(p);
        if (poseRef.current !== event.pose) {
          poseRef.current = event.pose;
          setPose(event.pose);
        }
        if (!interaction.current && event.selecting) hover(p);
        else if (!interaction.current && !event.selecting) clearHover();
        const target = hovered.current?.matches('[data-gesture-dwell]') ? hovered.current : null;
        const now = performance.now();
        const eligible = event.selecting && !interaction.current && now >= manualUntil.current;
        const {progress, activate} = dwell.current.update(target, now, eligible);
        if (dwellTarget.current !== target) dwellTarget.current?.classList.remove(styles.dwelling);
        dwellTarget.current = eligible ? target : null;
        dwellTarget.current?.classList.toggle(styles.dwelling, progress > 0 && progress < 1);
        cursorRef.current?.style.setProperty('--gesture-dwell', `${eligible ? progress * 360 : 0}deg`);
        if (hintRef.current)
          hintRef.current.textContent = eligible && target ? (progress >= 1 ? 'Chosen' : 'Hold to choose') : '';
        if (activate && target) target.click();
        return;
      }

      if (event.type === 'lost') {
        stopScroll();
        resetDwell();
        clearHover();
        hideCursor();
        poseRef.current = '';
        setPose('');
        return;
      }

      if (event.type === 'down') {
        cursorRef.current?.classList.add(styles.pinched);
        startInteraction(px(event.point));
        return;
      }

      if (event.type === 'move') {
        if (interaction.current?.type === 'draw') surfaceRef.current?.move(px(event.point));
        return;
      }

      if (event.type === 'up') {
        cursorRef.current?.classList.remove(styles.pinched);
        endInteraction(!!event.transform, px(event.point));
        return;
      }

      if (event.type === 'cancel') {
        releaseAll();
        if (event.reason === 'fist') {
          if (modeRef.current === 'paint') surfaceRef.current?.cancel();
          const close = document.querySelector<HTMLElement>('dialog[open] [data-gesture-close], [data-gesture-sheet] [data-gesture-close]');
          if (close) close.click();
          else setGuideOpen(false);
        }
        return;
      }

      if (event.type === 'menu') {
        stopScroll();
        resetDwell();
        if (modeRef.current === 'paint' && surfaceRef.current?.menu()) return;
        setGuideOpen(open => !open);
        return;
      }

      if (event.type === 'scrollstart') {
        stopScroll();
        if (modeRef.current === 'paint' && !activeLayer() && surfaceRef.current) {
          panning.current = true;
          surfaceRef.current.pan({x: 0, y: 0}, 'start');
        }
        return;
      }

      if (event.type === 'scroll') {
        if (performance.now() < manualUntil.current) {
          stopScroll();
          return;
        }
        if (panning.current && surfaceRef.current) {
          const anchor = px(event.anchor);
          const origin = px(event.origin);
          surfaceRef.current.pan({x: anchor.x - origin.x, y: anchor.y - origin.y}, 'move');
          return;
        }
        const surface = scrollSurface();
        if (!surface) {
          stopScroll();
          return;
        }
        const speed = scrollVelocity(event.displacement, preferencesRef.current.reverse) * SCROLL_SPEEDS[preferencesRef.current.scrollSpeed];
        if (scrollNode.current !== surface) {
          if (scrollNode.current) scrollNode.current.style.scrollBehavior = '';
          scrollNode.current = surface;
          // The site scrolls smoothly by default; per-frame motion must be immediate.
          surface.style.scrollBehavior = 'auto';
        }
        scrollMotion.current.setTarget(speed, performance.now());
        if (speed && !scrollFrame.current) scrollFrame.current = requestAnimationFrame(animateScroll);
        const tip = scrollTipRef.current;
        if (tip) {
          const p = px(event.point);
          tip.hidden = false;
          tip.style.transform = `translate(${Math.min(window.innerWidth - 150, p.x + 26)}px, ${clamp(p.y, 12, window.innerHeight - 56)}px)`;
          tip.textContent = speed === 0 ? 'Neutral — stopped' : speed > 0 ? 'Scrolling down' : 'Scrolling up';
        }
        return;
      }

      if (event.type === 'scrollpause') {
        cancelAnimationFrame(scrollFrame.current);
        scrollFrame.current = 0;
        scrollMotion.current.stop();
        return;
      }

      if (event.type === 'scrollend') {
        stopScroll();
        if (panning.current) {
          surfaceRef.current?.pan({x: 0, y: 0}, 'end');
          panning.current = false;
        }
        return;
      }

      if (event.type === 'transformstart') {
        stopScroll();
        resetDwell();
        const layer = activeLayer();
        const zoomNode = layer?.querySelector<HTMLElement>('[data-gesture-zoom]') || null;
        if (layer && !zoomNode) return;
        if (!layer && (modeRef.current !== 'paint' || !surfaceRef.current)) return;
        transform.current = {node: zoomNode, distance: event.distance, center: px(event.center), zoom: 1, x: 0, y: 0};
        if (!zoomNode) surfaceRef.current?.zoom(1, {x: 0, y: 0}, 'start');
        return;
      }

      if (event.type === 'transform' && transform.current?.distance) {
        const center = px(event.center);
        const scale = event.distance / transform.current.distance;
        const delta = {x: center.x - transform.current.center.x, y: center.y - transform.current.center.y};
        if (transform.current.node)
          transform.current.node.style.transform = `translate(${delta.x}px, ${delta.y}px) scale(${clamp(scale, 0.5, 4)})`;
        else surfaceRef.current?.zoom(scale, delta, 'move');
        return;
      }

      if (event.type === 'transformend') {
        if (transform.current && !transform.current.node) surfaceRef.current?.zoom(1, {x: 0, y: 0}, 'end');
        transform.current = null;
      }
    },
    [animateScroll, clearHover, endInteraction, hideCursor, hover, moveCursor, releaseAll, resetDwell, scrollSurface, startInteraction, stopScroll],
  );

  /* ── camera plumbing ─────────────────────────────────────────────────── */

  const receiveHands = useCallback((result: HandResult) => {
    lastSampleAt.current = performance.now();
    framesRef.current?.(result);
    const hands = result.landmarks || [];
    // MediaPipe labels a mirrored selfie image; these frames are unmirrored.
    const labels = (result.handedness || []).map(h => (h[0]?.categoryName === 'Left' ? 'Right' : 'Left'));
    const candidates = hands.map((lm, i) => ({...describeHand(lm, result.aspect), label: labels[i]}));
    // Handedness flips frame to frame on a single hand, which used to drop
    // tracking mid-stroke. With one hand in frame, that hand is the pointer.
    const primary = candidates.find(h => h.label === preferencesRef.current.hand) || (candidates.length === 1 ? candidates[0] : null);
    if (!primary) {
      // The model drops a hand for a frame or two during fast movement. Holding
      // the last pose through that keeps a stroke from breaking in half.
      missingSince.current ||= lastSampleAt.current;
      if (lastSampleAt.current - missingSince.current < HAND_GRACE) return;
      lastWrist.current = null;
      engineRef.current?.update(null, lastSampleAt.current);
      return;
    }
    missingSince.current = 0;
    if (lastWrist.current && Math.hypot(primary.wrist.x - lastWrist.current.x, primary.wrist.y - lastWrist.current.y) > 0.45)
      engineRef.current?.cancel();
    lastWrist.current = primary.wrist;
    const secondary = candidates.find(h => h !== primary);
    engineRef.current?.update(
      {point: primary.point, scrollPoint: primary.scrollPoint, pinchRatio: primary.pinchRatio, pose: primary.pose, secondary},
      lastSampleAt.current,
    );
  }, []);

  const cameraState = useCallback(
    (state: TrackerState, note?: string) => {
      if (state === 'loading') {
        setStatus('loading');
        setMessage(note || '');
        return;
      }
      if (state === 'requesting') {
        setStatus('requesting');
        setMessage(note || '');
        return;
      }
      if (state === 'running') {
        setStatus('tracking');
        setMessage('');
        return;
      }
      // 'off' — a stop, a pause, or a failure.
      releaseAll();
      hideCursor();
      engineRef.current?.reset();
      lastWrist.current = null;
      missingSince.current = 0;
      lastSampleAt.current = 0;
      poseRef.current = '';
      setPose('');
      framesRef.current?.(null);
      if (teardownRef.current) return;
      if (pausingRef.current) {
        pausingRef.current = false;
        setStatus('paused');
        setMessage('');
        return;
      }
      if (note) {
        enabledRef.current = false;
        setEnabled(false);
        setStatus('error');
        setMessage(note);
        return;
      }
      setStatus('off');
      setMessage('');
    },
    [hideCursor, releaseAll],
  );

  /* ── session controls ────────────────────────────────────────────────── */

  const enable = useCallback(async () => {
    if (admin) return;
    enabledRef.current = true;
    setEnabled(true);
    setGuideOpen(true);
    setMessage('');
    if (!videoRef.current) {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('aria-hidden', 'true');
      // Required by the capture pipeline; never shown outside /paint.
      video.className = styles.source;
      document.body.append(video);
      videoRef.current = video;
    }
    if (!trackerRef.current)
      trackerRef.current = new CameraTracker(videoRef.current, GESTURE_ASSET_BASE, receiveHands, cameraState);
    await trackerRef.current.start();
  }, [admin, cameraState, receiveHands]);

  const disable = useCallback(() => {
    enabledRef.current = false;
    pausingRef.current = false;
    setEnabled(false);
    trackerRef.current?.stop();
    setStatus('off');
    setMessage('');
  }, []);

  const resume = useCallback(async () => {
    if (!enabledRef.current) return;
    await trackerRef.current?.start();
  }, []);

  const setPreferences = useCallback((next: Partial<GesturePreferences>) => {
    setPreferencesState(current => {
      const merged = {...current, ...next};
      writePreferences(merged);
      return merged;
    });
    engineRef.current?.cancel();
    lastWrist.current = null;
  }, []);

  const registerSurface = useCallback((surface: GestureSurface | null) => {
    surfaceRef.current = surface;
  }, []);

  const registerHandFrames = useCallback((listener: ((result: HandResult | null) => void) | null) => {
    framesRef.current = listener;
  }, []);

  const videoElement = useCallback(() => videoRef.current, []);

  /* ── lifecycle ───────────────────────────────────────────────────────── */

  useEffect(() => {
    engineRef.current = new GestureEngine(handleGesture);
    return () => {
      engineRef.current = null;
    };
  }, [handleGesture]);

  // Stale tracking is treated as a lost hand rather than a frozen cursor.
  useEffect(() => {
    const timer = setInterval(() => {
      const tracker = trackerRef.current;
      const grace = Math.max(600, (tracker?.cost ?? 40) * 5);
      if (tracker?.running && lastSampleAt.current && performance.now() - lastSampleAt.current > grace) {
        lastSampleAt.current = 0;
        framesRef.current?.(null);
        engineRef.current?.update(null, performance.now());
      }
    }, 150);
    return () => clearInterval(timer);
  }, []);

  // Conventional input always wins, and briefly suppresses gesture selection.
  useEffect(() => {
    const manual = () => {
      manualUntil.current = performance.now() + 700;
      resetDwell();
      stopScroll();
    };
    const down = (event: PointerEvent) => {
      if (!event.isTrusted) return;
      mouseDown.current = true;
      manual();
      engineRef.current?.cancel();
    };
    const up = () => {
      mouseDown.current = false;
    };
    // Losing the window mid-drag would otherwise leave gestures frozen.
    window.addEventListener('blur', up);
    const key = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stopScroll();
      if (event.key === 'Escape') releaseAll();
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', up, true);
    window.addEventListener('wheel', manual, {passive: true});
    window.addEventListener('touchstart', manual, {passive: true});
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', up, true);
      window.removeEventListener('wheel', manual);
      window.removeEventListener('touchstart', manual);
      document.removeEventListener('keydown', key);
      window.removeEventListener('blur', up);
    };
  }, [releaseAll, resetDwell, stopScroll]);

  // Hiding the tab stops capture. Coming back needs a deliberate Resume.
  useEffect(() => {
    const visibility = () => {
      if (document.hidden && trackerRef.current?.running) {
        pausingRef.current = true;
        trackerRef.current.stop();
      }
    };
    const leaving = () => {
      teardownRef.current = true;
      trackerRef.current?.stop();
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', leaving);
    let width = window.innerWidth;
    const resize = () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      engineRef.current?.cancel();
      stopScroll();
    };
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', leaving);
      window.removeEventListener('resize', resize);
    };
  }, [stopScroll]);

  // A client route change keeps the session but drops every in-flight gesture.
  useEffect(() => {
    releaseAll();
    hideCursor();
    engineRef.current?.reset();
    lastWrist.current = null;
    if (admin && enabledRef.current) disable();
  }, [pathname, admin, disable, hideCursor, releaseAll]);

  // Provider teardown must not leave a camera running. The flag is cleared on
  // every mount so a development remount does not look like a teardown forever.
  useEffect(() => {
    teardownRef.current = false;
    return () => {
      teardownRef.current = true;
      trackerRef.current?.stop();
      trackerRef.current = null;
      videoRef.current?.remove();
      videoRef.current = null;
      cursorRef.current?.remove();
      cursorRef.current = null;
    };
  }, []);

  // Opt-in harness for reproducible browser tests; never present in production.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (!new URLSearchParams(window.location.search).has('gesture-test')) return;
    const scope = window as unknown as {__gestureTest?: unknown};
    scope.__gestureTest = {
      event: handleGesture,
      receiveHands,
      engine: engineRef,
      tracker: trackerRef,
      /** Viewport point to the normalised reach that would land on it. */
      toReach(x: number, y: number) {
        const region = modeRef.current === 'paint' ? surfaceRef.current?.region() ?? null : null;
        if (!region) return {x: x / window.innerWidth, y: y / window.innerHeight};
        return {x: (x - region.left) / region.width, y: (y - region.top) / region.height};
      },
      get preferences() {
        return preferencesRef.current;
      },
    };
    return () => {
      delete scope.__gestureTest;
    };
  }, [handleGesture, receiveHands]);

  const value = useMemo<GestureContextValue>(
    () => ({
      enabled,
      available: !admin,
      status,
      mode,
      message,
      pose,
      guideOpen,
      supported,
      preferences,
      enable,
      disable,
      resume,
      openGuide: () => setGuideOpen(true),
      minimizeGuide: () => setGuideOpen(false),
      dismissError: () => {
        setStatus('off');
        setMessage('');
      },
      setPreferences,
      registerSurface,
      registerHandFrames,
      videoElement,
    }),
    [enabled, admin, status, mode, message, pose, guideOpen, supported, preferences, enable, disable, resume, setPreferences, registerSurface, registerHandFrames, videoElement],
  );

  return (
    <GestureContext.Provider value={value}>
      {children}
      {!admin && (
        <div ref={scrollTipRef} className={styles.scrollTip} hidden aria-hidden="true" />
      )}
    </GestureContext.Provider>
  );
}
