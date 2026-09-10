"use client";

/**
 * Every choice stays visible at once. Reversible choices carry
 * `data-gesture-dwell`, so a hand can hold still to pick one; clearing,
 * downloading, and turning the camera on always need a real press.
 */

import {useEffect, useRef} from 'react';
import {paintStroke, type BrushId} from '@/lib/gestures/artboard';
import {ERASER_SIZES, INK_SIZES, PAINT_BRUSHES, PAINT_COLORS} from '@/lib/gestures/preferences';
import styles from './paint.module.css';

export type PaintColor = {name: string; hex: string};

export type ToolState = {
  brush: BrushId;
  color: PaintColor;
  size: number;
  paper: 'white' | 'night';
  transparent: boolean;
  strokes: number;
  redo: number;
  zoom: number;
};

export type ToolActions = {
  chooseColor(color: PaintColor): void;
  chooseBrush(brush: BrushId): void;
  chooseSize(size: number): void;
  toggleErase(): void;
  undo(): void;
  redo(): void;
  zoomBy(factor: number): void;
  resetView(): void;
  togglePaper(): void;
  setTransparent(next: boolean): void;
  askClear(): void;
};

/** A real stroke, drawn with the real brush, so the label is not the only clue. */
function BrushSample({brush, color}: {brush: BrushId; color: string}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const points = Array.from({length: 26}, (_, i) => ({
      x: 8 + (i / 25) * (canvas.width - 16),
      y: canvas.height / 2 + Math.sin(i / 3.1) * (canvas.height / 4.5),
    }));
    paintStroke(ctx, {brush, color, size: brush === 'marker' ? 2.4 : 3, seed: 7, points});
  }, [brush, color]);
  return <canvas ref={ref} width={152} height={44} style={{width: 76, height: 22}} aria-hidden />;
}

export default function PaintTools({
  state,
  actions,
  variant,
  clearing,
  onClear,
  onKeepDrawing,
}: {
  state: ToolState;
  actions: ToolActions;
  variant: 'rail' | 'sheet';
  clearing?: boolean;
  onClear?(): void;
  onKeepDrawing?(): void;
}) {
  const erasing = state.brush === 'eraser';
  const sizes = erasing ? ERASER_SIZES : INK_SIZES;
  const sheet = variant === 'sheet';

  return (
    <>
      <section className={styles.group}>
        <h2>Colour — {state.color.name}</h2>
        <div className={styles.swatches}>
          {PAINT_COLORS.map(color => (
            <button
              key={color.hex}
              type="button"
              className={styles.swatch}
              style={{['--swatch' as string]: color.hex}}
              aria-pressed={state.color.hex === color.hex}
              onClick={() => actions.chooseColor(color)}
              data-gesture-dwell
            >
              <i aria-hidden />
              {color.name}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.group}>
        <h2>Brush</h2>
        <div className={styles.brushes}>
          {PAINT_BRUSHES.map(brush => (
            <button
              key={brush.id}
              type="button"
              className={styles.brush}
              aria-pressed={state.brush === brush.id}
              onClick={() => actions.chooseBrush(brush.id)}
              data-gesture-dwell
            >
              <BrushSample brush={brush.id} color={state.color.hex} />
              <span>
                {brush.label}
                <small>{brush.note}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.group}>
        <h2>{erasing ? 'Eraser size' : 'Brush size'}</h2>
        <div className={styles.sizes}>
          {sizes.map(size => (
            <button
              key={size}
              type="button"
              className={styles.size}
              aria-label={`${size} pixels`}
              aria-pressed={state.size === size}
              onClick={() => actions.chooseSize(size)}
              data-gesture-dwell
            >
              <i style={{width: Math.min(26, 5 + size / 5), height: Math.min(26, 5 + size / 5)}} aria-hidden />
            </button>
          ))}
        </div>
        <label className={styles.sliderLabel}>
          <span>Fine</span>
          <span>{state.size} px</span>
        </label>
        <input
          className={styles.slider}
          type="range"
          min={2}
          max={erasing ? 140 : 60}
          value={state.size}
          aria-label={erasing ? 'Eraser size in pixels' : 'Brush size in pixels'}
          onChange={event => actions.chooseSize(Number(event.target.value))}
        />
      </section>

      <section className={styles.group}>
        <h2>Page</h2>
        <div className={styles.buttons}>
          <button type="button" className={styles.button} aria-pressed={erasing} onClick={actions.toggleErase} data-gesture-dwell>
            {erasing ? 'Draw' : 'Erase'}
          </button>
          <button type="button" className={styles.button} onClick={actions.undo} disabled={!state.strokes} data-gesture-dwell>
            Undo
          </button>
          <button type="button" className={styles.button} onClick={actions.redo} disabled={!state.redo} data-gesture-dwell>
            Redo
          </button>
          {!sheet && (
            <>
              <button type="button" className={styles.button} onClick={() => actions.zoomBy(1.2)} aria-label="Zoom in" data-gesture-dwell>
                Zoom in
              </button>
              <button type="button" className={styles.button} onClick={() => actions.zoomBy(1 / 1.2)} aria-label="Zoom out" data-gesture-dwell>
                Zoom out
              </button>
              <button type="button" className={styles.button} onClick={actions.resetView} data-gesture-dwell>
                Fit ({Math.round(state.zoom * 100)}%)
              </button>
              <button type="button" className={styles.button} onClick={actions.togglePaper} data-gesture-dwell>
                {state.paper === 'white' ? 'Night paper' : 'White paper'}
              </button>
            </>
          )}
        </div>
        {!sheet && (
          <div className={styles.buttons} style={{marginTop: 10}}>
            {clearing ? (
              <span className={styles.confirm}>
                Clear the whole page?
                <button type="button" className={styles.button} onClick={onClear}>
                  Clear it
                </button>
                <button type="button" className={styles.link} onClick={onKeepDrawing}>
                  Keep drawing
                </button>
              </span>
            ) : (
              <button
                type="button"
                className={`${styles.button} ${styles.danger}`}
                onClick={actions.askClear}
                disabled={!state.strokes}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </section>
    </>
  );
}
