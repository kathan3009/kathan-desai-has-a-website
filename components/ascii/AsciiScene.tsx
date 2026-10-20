"use client";
/* A photograph redrawn in characters. Each glyph is picked by how much ink it
   actually lays down in the font, edges are traced with strokes that follow
   their direction, every character wears the photograph's own colour, and
   the broad empty ground (a night sky, a pale one) becomes a sparse halftone
   of dots. It develops from the brightest point outwards;
   at night the stars twinkle and a click on the sky sends a shooting star.
   The pointer carries a lantern. Only cells that change are repainted. */

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../MotionPreference';

type Props = {
  src: string;
  label: string;
  /** Point of the photograph kept in view when the frame crops it, 0 to 1. */
  focus?: [number, number];
  /** Share of the frame, emptiest first, left as paper. Found automatically
      from the photograph's dominant tone when not given. */
  floor?: number;
  className?: string;
};

type RGB = [number, number, number];
type Cell = { lum: number; heat: number; color: RGB; wash: boolean; star: boolean; edge: number; strength: number; seed: number; develop: number };
type Meteor = { x: number; y: number; vx: number; vy: number; life: number };

const NOISE = "01<>/\\|{}[]$#*";
// Strokes are kept for edges. The tone ramp avoids most letters and digits,
// which read as words rather than texture.
const TONE = " .`',:;~^\"=+*ox%#&@";
const STROKE = { flat: 45, rise: 47, upright: 124, fall: 92 };

// Reads a page colour token, so the scene knows the paper it is drawn on.
function token(el: Element, name: string, fallback: RGB): RGB {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  const rgb = value.match(/^rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  // The stylesheet build may shorten #000000 to #000.
  let hex = value.replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = [...hex].map(c => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)) as RGB;
}

// Colour comes straight from the photograph. Only lightness moves, and only
// as far as it takes for a character to stay visible on the page: pale snow
// darkens a little on white, a navy sky lifts a little on black.
const channel = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]: RGB) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: RGB, b: RGB) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

function toHsl([r, g, b]: RGB): RGB {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d < 0.0001) return [0, 0, l];
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h, d / (1 - Math.abs(2 * l - 1)), l];
}

function fromHsl([h, s, l]: RGB): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// On a dark page a character only covers part of its cell, so it is drawn at
// the photograph's hue and saturation but full brightness; the glyph's
// density supplies the darkness, the way it does in the picture.
function lift([r, g, b]: RGB): RGB {
  const k = Math.min(255 / Math.max(r, g, b, 1), 3.2);
  return [Math.min(255, Math.round(r * k)), Math.min(255, Math.round(g * k)), Math.min(255, Math.round(b * k))];
}

function fit(color: RGB, page: RGB, least = 2.4): RGB {
  if (contrast(color, page) >= least) return color;
  const [h, s, l] = toHsl(color);
  const darken = luminance(page) > 0.5;
  // Search for the lightness nearest the original that is just visible.
  let lo = darken ? 0 : l, hi = darken ? l : 1;
  for (let step = 0; step < 14; step++) {
    const mid = (lo + hi) / 2, ok = contrast(fromHsl([h, s, mid]), page) >= least;
    if (darken) { if (ok) lo = mid; else hi = mid; } else { if (ok) hi = mid; else lo = mid; }
  }
  return fromHsl([h, s, darken ? lo : hi]);
}

// Measures each glyph's ink in the real font and returns a 64-step lookup
// from tone to the glyph whose coverage is closest.
function toneTable(font: string, cw: number, ch: number) {
  const c = document.createElement('canvas');
  const w = Math.ceil(cw) * 2, h = Math.ceil(ch) * 2;
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return Array.from({ length: 64 }, (_, i) => TONE.charCodeAt(Math.round(i / 63 * (TONE.length - 1))));
  g.scale(2, 2); g.font = font; g.textBaseline = 'top'; g.fillStyle = '#000';
  const ink = [...TONE].map(glyph => {
    g.clearRect(0, 0, w, h); g.fillText(glyph, 0, 1);
    const d = g.getImageData(0, 0, w, h).data;
    let sum = 0; for (let i = 3; i < d.length; i += 4) sum += d[i];
    return { code: glyph.charCodeAt(0), ink: sum };
  });
  const most = Math.max(...ink.map(i => i.ink)) || 1;
  return Array.from({ length: 64 }, (_, level) => {
    const want = Math.pow(level / 63, 1.1) * most;
    return ink.reduce((best, i) => Math.abs(i.ink - want) < Math.abs(best.ink - want) ? i : best).code;
  });
}

const quantile = (sorted: ArrayLike<number>, q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
const random = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export default function AsciiScene({ src, label, focus = [0.5, 0.5], floor, className = '' }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [fx, fy] = focus;

  useEffect(() => {
    const box = frame.current, el = canvas.current;
    if (!box || !el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;

    let cells: Cell[] = [], keys = new Int32Array(0), table: number[] = [];
    let cols = 0, rows = 0, cw = 0, ch = 0;
    let raf = 0, visible = true, built = false, start = 0, last = 0, night = true;
    let image: HTMLImageElement | null = null;
    let ink: RGB = [21, 21, 21], glow: RGB = [217, 130, 0];
    const light = { x: -999, y: -999, power: 0, target: 0 };
    const meteors: Meteor[] = [];
    let meteorSent = false;

    function build() {
      if (!image || !box || !el || !ctx) return;
      const { width, height } = box.getBoundingClientRect();
      if (width < 10 || height < 10) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      el.width = Math.round(width * dpr); el.height = Math.round(height * dpr);
      el.style.width = `${width}px`; el.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const fs = width < 560 ? 7.5 : width < 1000 ? 8.5 : 9.5;
      const font = `400 ${fs}px ${getComputedStyle(el).fontFamily || 'monospace'}`;
      ctx.font = font; ctx.textBaseline = 'top';
      cw = ctx.measureText('M').width; ch = fs * 1.2;
      cols = Math.ceil(width / cw); rows = Math.ceil(height / ch);
      table = toneTable(font, cw, ch);
      ink = token(el, '--foreground', ink); glow = token(el, '--lantern', glow);

      // Cover the frame with the photograph, keeping the focus point in view,
      // then sample six by six per cell so lone points of light survive.
      const iw = image.naturalWidth, ih = image.naturalHeight;
      const scale = Math.max(width / iw, height / ih);
      const sw = width / scale, sh = height / scale;
      const sx = Math.min(Math.max(fx * iw - sw / 2, 0), iw - sw);
      const sy = Math.min(Math.max(fy * ih - sh / 2, 0), ih - sh);
      const k = 6, off = document.createElement('canvas');
      off.width = cols * k; off.height = rows * k;
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (!octx) return;
      octx.drawImage(image, sx, sy, sw, sh, 0, 0, off.width, off.height);
      const data = octx.getImageData(0, 0, off.width, off.height).data;

      const count = cols * rows;
      const mean = new Float32Array(count), peak = new Float32Array(count), low = new Float32Array(count);
      const red = new Float32Array(count), green = new Float32Array(count), blue = new Float32Array(count);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        let r = 0, gr = 0, b = 0, l = 0, hi = 0, lo = 1;
        for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
          const p = ((y * k + j) * off.width + x * k + i) * 4;
          const v = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
          r += data[p]; gr += data[p + 1]; b += data[p + 2]; l += v; hi = Math.max(hi, v); lo = Math.min(lo, v);
        }
        const n = k * k, at = y * cols + x;
        mean[at] = l / n; peak[at] = hi; low[at] = lo; red[at] = r / n; green[at] = gr / n; blue[at] = b / n;
      }

      // A dark photograph is drawn by its light, a pale one by its shadows,
      // so in both the empty ground stays empty.
      night = quantile(Float32Array.from(mean).sort(), 0.5) < 0.42;
      const tone = Float32Array.from(mean, m => night ? m : 1 - m);
      const ordered = Float32Array.from(tone).sort();
      let base: number;
      if (floor !== undefined) base = quantile(ordered, floor);
      else {
        // The ground is the most common tone, and everything just above it.
        const bins = new Float32Array(48);
        for (const v of tone) bins[Math.min(47, Math.floor(v * 48))]++;
        const smooth = (i: number) => (bins[i - 1] || 0) + bins[i] + (bins[i + 1] || 0);
        let mode = 0;
        for (let i = 1; i < 48; i++) if (smooth(i) > smooth(mode)) mode = i;
        base = Math.min((mode + 1) / 48 + 0.07, quantile(ordered, 0.92));
      }
      const top = Math.max(quantile(ordered, 0.997), base + 0.05);

      // Edges from a Sobel pass, with rows weighted by the taller cell.
      const at = (x: number, y: number) => tone[Math.min(rows - 1, Math.max(0, y)) * cols + Math.min(cols - 1, Math.max(0, x))];
      const gxs = new Float32Array(count), gys = new Float32Array(count), mags = new Float32Array(count);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const gx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
        const gy = ((at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1))) * (cw / ch);
        const i = y * cols + x;
        gxs[i] = gx; gys[i] = gy; mags[i] = Math.hypot(gx, gy);
      }
      const edgeCut = Math.max(quantile(Float32Array.from(mags).sort(), 0.9), 0.2);

      // Development starts from the brightest part of the picture.
      let ox = 0, oy = 0, lit = 0;
      const bright = quantile(ordered, 0.99);
      tone.forEach((v, i) => { if (v >= bright) { ox += i % cols; oy += Math.floor(i / cols); lit++; } });
      if (lit) { ox /= lit; oy /= lit; } else { ox = cols / 2; oy = rows / 2; }
      const far = Math.hypot(Math.max(ox, cols - ox), Math.max(oy, rows - oy) * 2);

      // Points are lone features smaller than a cell or two: stars at night,
      // birds against a pale sky. They get no outline, or they turn into boxes.
      const point = new Uint8Array(count);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        let around = 0;
        for (let j = -1; j <= 1; j++) for (let k2 = -1; k2 <= 1; k2++) if (j || k2) around += at(x + k2, y + j);
        const lone = tone[i] > base && tone[i] - around / 8 > 0.1;
        const twinkle = night && y < rows * 0.8 && peak[i] - mean[i] > 0.15 && peak[i] > 0.36 && tone[i] < base + 0.1;
        if (lone || twinkle) point[i] = twinkle ? 2 : 1;
      }
      const nearPoint = (x: number, y: number) => {
        for (let j = -1; j <= 1; j++) for (let k2 = -1; k2 <= 1; k2++) {
          const px = x + k2, py = y + j;
          if (px >= 0 && py >= 0 && px < cols && py < rows && point[py * cols + px]) return true;
        }
        return false;
      };

      const page = token(el, '--background', [255, 255, 255]), dark = luminance(page) < 0.5;
      let stars = 0;
      cells = Array.from(tone, (v, i) => {
        const x = i % cols, y = Math.floor(i / cols);
        const star = point[i] === 2;
        if (star) stars++;
        const lum = star ? 0.45 + peak[i] * 0.5 : Math.pow(Math.min(Math.max((v - base) / (top - base), 0), 1), 0.9);
        // Every character takes the colour of its part of the photograph;
        // heat marks the warm light that flickers like a lantern.
        const heat = night && lum > 0.08 ? Math.min(Math.max((red[i] - blue[i] - 18) / 90, 0), 1) : 0;
        let edge = 0, strength = 0;
        if (!point[i] && !nearPoint(x, y) && mags[i] > edgeCut && lum < 0.65) {
          strength = Math.min(1, (mags[i] - edgeCut) / (edgeCut * 2) + 0.35);
          // The stroke runs along the edge, at right angles to the gradient.
          const a = ((Math.atan2(gxs[i], -gys[i]) % Math.PI) + Math.PI) % Math.PI;
          edge = a < Math.PI / 8 || a >= 7 * Math.PI / 8 ? STROKE.flat : a < 3 * Math.PI / 8 ? STROKE.fall : a < 5 * Math.PI / 8 ? STROKE.upright : STROKE.rise;
        }
        const seed = random(i + cols * 7);
        const dist = Math.hypot(x - ox, (y - oy) * 2) / far;
        // The empty ground keeps its colour as a sparse halftone of dots, so a
        // blue-hour sky still reads as blue without filling up with characters.
        const wash = !lum && !edge && !star && (x + y) % 2 === 0 && v > 0.07;
        return { lum, heat, color: fit(dark ? lift([red[i], green[i], blue[i]]) : [Math.round(red[i]), Math.round(green[i]), Math.round(blue[i])], page), wash, star, edge, strength, seed, develop: dist * 0.72 + seed * 0.28 };
      });
      meteorSent = !(night && stars > 25);
      keys = new Int32Array(cells.length).fill(-1);
      ctx.clearRect(0, 0, width, height);
      built = true;
    }

    function paint(now: number) {
      if (!built || !ctx) return;
      const t = (now - start) / 1000;
      const settle = reduced ? 1 : Math.min(t / 2.4, 1);
      const progress = 1 - Math.pow(1 - settle, 3);
      const flicker = 0.9 + 0.06 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 13.1 + 1.7);
      const dt = Math.min((now - last) / 1000, 0.05) || 0.016;
      last = now;

      light.power += (light.target - light.power) * (reduced ? 1 : Math.min(dt * 6, 1));
      const radius = Math.max(120, Math.min(cols * cw, 1400) * 0.14);

      // Meteors leave a short trail of slashes behind a bright head.
      const trail = new Map<number, [number, number]>();
      for (const m of meteors) {
        m.x += m.vx * dt; m.y += m.vy * dt; m.life -= dt;
        for (let s = 0; s < 16; s++) {
          const cx = Math.round(m.x - (m.vx / 60) * s * 0.9), cy = Math.round(m.y - (m.vy / 60) * s * 0.9);
          if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
          const glyph = s === 0 ? 42 : s < 5 ? 47 : s < 10 ? 39 : 46;
          trail.set(cy * cols + cx, [glyph, Math.max(0.25, 1 - s / 16) * Math.min(m.life * 2, 1)]);
        }
      }
      for (let i = meteors.length - 1; i >= 0; i--) if (meteors[i].life <= 0 || meteors[i].x < -20 || meteors[i].y > rows + 20) meteors.splice(i, 1);

      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const x = i % cols, y = (i - x) / cols;
        let b = c.edge ? Math.max(c.lum, 0.3 + c.strength * 0.45) : c.lum, glyph = -1;
        const local = progress >= 1 ? 1 : (progress - c.develop) / 0.12;
        if (local <= 0) b = 0;
        else if (local < 1) {
          glyph = NOISE.charCodeAt(Math.floor(random(i + Math.floor(t * 18)) * NOISE.length));
          b = Math.max(b, 0.3) * local;
        }

        if (c.star && !reduced) b *= 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (1.2 + c.seed * 2.6) + c.seed * 40));
        if (c.heat > 0.5 && c.lum > 0.3) b *= flicker;

        let warmth = 0;
        if (light.power > 0.01) {
          const d = Math.hypot((x + 0.5) * cw - light.x, (y + 0.5) * ch - light.y);
          if (d < radius) {
            const f = Math.pow(1 - d / radius, 2) * light.power;
            b = Math.min(1, b + f * (0.45 + c.lum * 0.7));
            warmth = Math.min(4, Math.round(f * 5));
          }
        }

        const hit = trail.get(i);
        if (hit) { glyph = hit[0]; b = Math.max(b, hit[1]); warmth = 0; }

        const level = Math.round(Math.min(b, 1) * 63);
        const washed = level === 0 && c.wash && local >= 1 && !hit;
        if (glyph < 0) glyph = washed ? 46 : c.star && level > 0 ? (level > 40 ? 42 : level > 22 ? 43 : 46) : c.edge && level > 0 ? c.edge : table[level];
        const shade = washed ? 11 : Math.round(Math.min(b, 1) * 12);
        const key = !washed && (glyph === 32 || level === 0) ? 0 : glyph * 1000 + warmth * 100 + shade;
        if (key === keys[i]) continue;
        keys[i] = key;

        ctx.clearRect(x * cw, y * ch, cw, ch);
        if (key === 0) continue;
        const mix = warmth / 4, alpha = Math.min(1, 0.4 + shade / 12);
        const [r, g, bl] = hit ? ink : c.color.map((v, n) => Math.round(v + (glow[n] - v) * mix));
        ctx.fillStyle = `rgba(${r},${g},${bl},${alpha})`;
        ctx.fillText(String.fromCharCode(glyph), x * cw, y * ch + 1);
      }

      if (!meteorSent && progress >= 1 && t > 3.2) { meteorSent = true; launch(cols * 0.78, rows * 0.06); }
    }

    function launch(x: number, y: number) {
      meteors.push({ x, y, vx: -cols * 0.55, vy: rows * 0.32, life: 1.6 });
    }

    // While the scene is developing, twinkling or lit, it needs frames; once
    // still and unlit (or with reduced motion) it waits for the next change.
    function loop(now: number) {
      raf = 0;
      paint(now);
      const settling = (now - start) / 1000 < 2.6;
      const lit = light.power > 0.01 || light.target > 0;
      if (visible && (settling || lit || meteors.length || (night && !reduced))) raf = requestAnimationFrame(loop);
    }
    const wake = () => { if (!raf && visible) raf = requestAnimationFrame(loop); };

    function onMove(e: PointerEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      light.x = e.clientX - rect.left; light.y = e.clientY - rect.top; light.target = 1;
      wake();
    }
    function onLeave() { light.target = 0; wake(); }
    function onClick(e: PointerEvent) {
      if (reduced || !el || !night) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / cw, y = (e.clientY - rect.top) / ch;
      if (y < rows * 0.7) { launch(x + cols * 0.12, Math.max(0, y - rows * 0.08)); wake(); }
    }

    let resizeTimer = 0;
    const resize = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => { build(); start = performance.now() - 2600; wake(); }, 120);
    });
    const scheme = matchMedia('(prefers-color-scheme: dark)');
    const restyle = () => { if (image) { build(); start = performance.now() - 2600; wake(); } };
    const theme = new MutationObserver(restyle);
    const seen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); });
    const onVisibility = () => { visible = document.visibilityState === 'visible'; if (visible) wake(); };

    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    box.dataset.ready = 'false';
    Promise.all([img.decode(), document.fonts?.ready]).then(() => {
      if (cancelled) return;
      image = img; build();
      start = last = performance.now();
      box.dataset.ready = 'true';
      resize.observe(box); seen.observe(box);
      scheme.addEventListener('change', restyle);
      theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      wake();
    }).catch(() => { if (!cancelled) box.dataset.ready = 'failed'; });

    box.addEventListener('pointermove', onMove);
    box.addEventListener('pointerleave', onLeave);
    box.addEventListener('pointerdown', onClick);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf); clearTimeout(resizeTimer);
      resize.disconnect(); seen.disconnect(); theme.disconnect();
      scheme.removeEventListener('change', restyle);
      box.removeEventListener('pointermove', onMove);
      box.removeEventListener('pointerleave', onLeave);
      box.removeEventListener('pointerdown', onClick);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [src, fx, fy, floor, reduced]);

  return <div ref={frame} className={`ascii-scene ${className}`.trim()}>
    <canvas ref={canvas} role="img" aria-label={label} />
  </div>;
}
