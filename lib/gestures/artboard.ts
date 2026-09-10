/** Strokes are stored as vectors in memory; only the artwork is rasterized on export. */

export type BrushId = 'pen' | 'marker' | 'neon' | 'web' | 'spray' | 'eraser';

export type Stroke = {
  brush: BrushId;
  color: string;
  size: number;
  seed: number;
  points: {x: number; y: number}[];
};

export class Artboard {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Finished strokes, kept rasterised so drawing never repaints the history. */
  base: HTMLCanvasElement;
  baseCtx: CanvasRenderingContext2D;
  onChange: () => void;
  width = 1600;
  height = 1000;
  strokes: Stroke[] = [];
  redoStack: Stroke[] = [];
  active: Stroke | null = null;
  view = {zoom: 1, x: 0, y: 0};
  background = '#ffffff';

  constructor(canvas: HTMLCanvasElement, onChange: () => void = () => {}, restore?: {strokes: Stroke[]; background: string}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onChange = onChange;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.base = document.createElement('canvas');
    this.base.width = this.width;
    this.base.height = this.height;
    this.baseCtx = this.base.getContext('2d')!;
    if (restore) {
      this.strokes = restore.strokes;
      this.background = restore.background;
    }
    this.rebuild();
  }

  point(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    return {x: ((clientX - r.left) / r.width) * this.width, y: ((clientY - r.top) / r.height) * this.height};
  }

  begin(point: {x: number; y: number}, brush: BrushId, color: string, size: number) {
    this.active = {brush, color, size, seed: this.strokes.length + 1, points: [point]};
    this.render();
  }

  move(point: {x: number; y: number}) {
    if (!this.active) return;
    const p = this.active.points.at(-1)!;
    if (Math.hypot(p.x - point.x, p.y - point.y) < 1.2) return;
    this.active.points.push(point);
    this.render();
  }

  end() {
    if (this.active) {
      // One extra stroke on the finished layer, rather than a full repaint.
      paintStroke(this.baseCtx, this.active);
      this.strokes.push(this.active);
      this.redoStack = [];
      this.active = null;
      this.onChange();
      this.render();
    }
  }

  undo() {
    this.end();
    if (this.strokes.length) this.redoStack.push(this.strokes.pop()!);
    this.rebuild();
    this.onChange();
  }

  redo() {
    if (this.redoStack.length) {
      this.strokes.push(this.redoStack.pop()!);
      this.rebuild();
    }
    this.onChange();
  }

  clear() {
    this.active = null;
    this.strokes = [];
    this.redoStack = [];
    this.rebuild();
    this.onChange();
  }

  /** Only for edits that change history: undo, redo, clear, restore. */
  rebuild() {
    this.baseCtx.clearRect(0, 0, this.width, this.height);
    this.strokes.forEach(stroke => paintStroke(this.baseCtx, stroke));
    this.render();
  }

  setView(zoom: number, x = this.view.x, y = this.view.y) {
    this.view = {
      zoom: Math.max(0.5, Math.min(3, zoom)),
      x: Math.max(-700, Math.min(700, x)),
      y: Math.max(-500, Math.min(500, y)),
    };
    this.canvas.style.transform = `translate(${this.view.x}px, ${this.view.y}px) scale(${this.view.zoom})`;
  }

  paint(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    paintStroke(ctx, stroke);
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.base, 0, 0);
    if (this.active) paintStroke(this.ctx, this.active);
  }

  async blob(transparent = false) {
    this.end();
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.width;
    exportCanvas.height = this.height;
    const ctx = exportCanvas.getContext('2d')!;
    if (!transparent) {
      ctx.fillStyle = this.background;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    ctx.drawImage(this.canvas, 0, 0);
    return new Promise<Blob>((resolve, reject) =>
      exportCanvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Image export failed.'))), 'image/png'),
    );
  }
}

/** Shared by the artboard and by the small brush previews in the tool rail. */
export function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    const {points: p, brush, color, size} = stroke;
    if (!p.length) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (brush === 'eraser') ctx.globalCompositeOperation = 'destination-out';
    if (brush === 'marker') {
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = size * 2.5;
    }
    if (brush === 'neon') {
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 2;
    }
    if (brush === 'spray') {
      let seed = stroke.seed;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      p.forEach(pt => {
        for (let i = 0; i < 15; i++) {
          const a = random() * Math.PI * 2;
          const r = Math.sqrt(random()) * size * 2;
          ctx.beginPath();
          ctx.arc(pt.x + Math.cos(a) * r, pt.y + Math.sin(a) * r, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    } else {
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(p[0].x, p[0].y);
        if (p.length === 1) ctx.lineTo(p[0].x + 0.01, p[0].y);
        // Curve through the midpoints: a hand never moves in straight segments.
        for (let i = 1; i < p.length - 1; i++)
          ctx.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2);
        if (p.length > 1) ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
        ctx.stroke();
      };
      path();
      if (brush === 'neon') {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = Math.max(1, size * 0.25);
        path();
      }
      if (brush === 'web') {
        ctx.lineWidth = Math.max(1, size * 0.1);
        ctx.globalAlpha = 0.45;
        p.forEach((pt, i) => {
          for (let j = Math.max(0, i - 35); j < i - 4; j += 3) {
            if (Math.hypot(pt.x - p[j].x, pt.y - p[j].y) < 150) {
              ctx.beginPath();
              ctx.moveTo(pt.x, pt.y);
              ctx.lineTo(p[j].x, p[j].y);
              ctx.stroke();
            }
          }
        });
      }
    }
    ctx.restore();
}
