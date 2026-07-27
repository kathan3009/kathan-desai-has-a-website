"use client";

import { useEffect, useRef } from "react";

/**
 * The web-cast: anchor strands fire from the toggle to the edges of the screen,
 * spiral threads bridge between them ring by ring, then a flash frame covers the
 * swap and the whole web dissolves. Strands print with a red/blue fringe so the
 * cast matches the misregistered comic plates in the rest of the mode.
 */

const RADIALS = 15;
const RINGS = 8;

// Timeline, in ms.
const SPOKE_START = 0;
const SPOKE_DUR = 380;
const SPOKE_STAGGER = 110;
const RING_START = 280;
const RING_STEP = 52;
const RING_DUR = 240;
const FLASH_START = 780;
const FLASH_PEAK = 900;
const FLASH_END = 1060;
const FADE_START = 1020;
const TOTAL = 1480;

type Origin = { x: number; y: number };

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export default function WebCast({
  origin,
  to,
  onFlip,
  onDone,
}: {
  origin: Origin;
  to: boolean;
  onFlip: (to: boolean) => void;
  onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flipped = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Reach the farthest corner, with slack so no strand tip is ever on screen.
    const corners = [
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
    ];
    const maxReach =
      Math.max(
        ...corners.map(([cx, cy]) =>
          Math.hypot(cx - origin.x, cy - origin.y)
        )
      ) * 1.15;

    // Deterministic jitter so the web looks hand-spun, not machine-perfect.
    const wobble = (i: number, salt: number) =>
      Math.sin(i * 12.9898 + salt * 78.233) * 0.5 + 0.5;

    const spokes = Array.from({ length: RADIALS }, (_, i) => {
      const angle =
        (i / RADIALS) * Math.PI * 2 + (wobble(i, 1) - 0.5) * 0.22;
      const reach = maxReach * (0.88 + wobble(i, 2) * 0.24);
      return {
        angle,
        reach,
        delay: wobble(i, 3) * SPOKE_STAGGER,
        cos: Math.cos(angle),
        sin: Math.sin(angle),
      };
    });

    const nodeAt = (spokeIndex: number, ring: number) => {
      const s = spokes[spokeIndex];
      // Rings bunch near the origin and spread outward, like an orb weaver's.
      const t = Math.pow((ring + 1) / RINGS, 1.45);
      const r = s.reach * t * (0.92 + wobble(spokeIndex * 7 + ring, 4) * 0.16);
      return { x: origin.x + s.cos * r, y: origin.y + s.sin * r };
    };

    /** Draw a path three times — red plate, blue plate, silk on top. */
    const inkedStroke = (
      path: (c: CanvasRenderingContext2D) => void,
      alpha: number,
      width: number
    ) => {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.globalCompositeOperation = "screen";
      ctx.lineWidth = width;
      ctx.strokeStyle = `rgba(240,48,62,${alpha * 0.4})`;
      ctx.save();
      ctx.translate(1.8, 0);
      ctx.beginPath();
      path(ctx);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = `rgba(43,84,255,${alpha * 0.4})`;
      ctx.save();
      ctx.translate(-1.8, 0);
      ctx.beginPath();
      path(ctx);
      ctx.stroke();
      ctx.restore();

      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = width * 0.85;
      ctx.strokeStyle = `rgba(244,247,255,${Math.min(alpha * 1.25, 1)})`;
      ctx.beginPath();
      path(ctx);
      ctx.stroke();
    };

    let raf = 0;
    const start = performance.now();

    const frame = (now: number) => {
      const time = now - start;
      ctx.clearRect(0, 0, w, h);

      // Scrim — darkens the outgoing theme so silk reads against it.
      const scrimIn = clamp01(time / 260) * 0.92;
      const scrimOut = 1 - clamp01((time - FADE_START) / (TOTAL - FADE_START));
      ctx.fillStyle = `rgba(4,3,10,${scrimIn * scrimOut})`;
      ctx.fillRect(0, 0, w, h);

      const webFade = scrimOut;

      // Anchor strands.
      spokes.forEach((s) => {
        const p = clamp01((time - SPOKE_START - s.delay) / SPOKE_DUR);
        if (p <= 0) return;
        // Slight overshoot, then settle — the strand snaps taut.
        const eased = easeOutCubic(p);
        const len = s.reach * eased;
        const tipX = origin.x + s.cos * len;
        const tipY = origin.y + s.sin * len;

        inkedStroke(
          (c) => {
            c.moveTo(origin.x, origin.y);
            c.lineTo(tipX, tipY);
          },
          0.85 * webFade,
          2.6
        );
      });

      // Spiral threads, ring by ring, sagging between anchors.
      for (let ring = 0; ring < RINGS; ring++) {
        const p = clamp01((time - RING_START - ring * RING_STEP) / RING_DUR);
        if (p <= 0) continue;
        const eased = easeOutCubic(p);

        for (let i = 0; i < RADIALS; i++) {
          const a = nodeAt(i, ring);
          const b = nodeAt((i + 1) % RADIALS, ring);

          // Grow each segment out from its anchor as the ring lands.
          const gx = a.x + (b.x - a.x) * eased;
          const gy = a.y + (b.y - a.y) * eased;

          // Sag toward the origin — silk under its own weight.
          const mx = (a.x + gx) / 2;
          const my = (a.y + gy) / 2;
          const cx = mx + (origin.x - mx) * 0.14;
          const cy = my + (origin.y - my) * 0.14;

          inkedStroke(
            (c) => {
              c.moveTo(a.x, a.y);
              c.quadraticCurveTo(cx, cy, gx, gy);
            },
            0.6 * webFade,
            1.8
          );
        }
      }

      // Flash — covers the palette swap.
      if (time >= FLASH_START && time <= FLASH_END) {
        const t =
          time < FLASH_PEAK
            ? (time - FLASH_START) / (FLASH_PEAK - FLASH_START)
            : 1 - (time - FLASH_PEAK) / (FLASH_END - FLASH_PEAK);
        ctx.fillStyle = `rgba(255,255,255,${clamp01(t) * 0.96})`;
        ctx.fillRect(0, 0, w, h);
      }

      if (!flipped.current && time >= FLASH_PEAK) {
        flipped.current = true;
        onFlip(to);
      }

      if (time >= TOTAL) {
        onDone();
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(raf);
    // The cast runs once per mount; the provider remounts it for each toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safety net: if rAF is throttled (backgrounded tab), still land the mode.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!flipped.current) {
        flipped.current = true;
        onFlip(to);
      }
      onDone();
    }, TOTAL + 600);
    return () => window.clearTimeout(timer);
  }, [onDone, onFlip, to]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      aria-hidden="true"
    />
  );
}
