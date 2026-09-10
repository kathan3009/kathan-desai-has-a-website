"use client";

/**
 * The drawing surface, the tools, and a small live preview. Paint does not own a
 * camera: it registers a surface with the shared gesture session and borrows it.
 */

import Link from 'next/link';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Artboard, type BrushId, type Stroke} from '@/lib/gestures/artboard';
import {ERASER_SIZES, PAINT_BRUSHES, PAINT_COLORS, PAPERS} from '@/lib/gestures/preferences';
import {useGestures, type GestureSurface} from '../gestures/GestureProvider';
import HandPreview from './HandPreview';
import PaintTools, {type PaintColor, type ToolActions, type ToolState} from './PaintTools';
import styles from './paint.module.css';

const READING: Record<string, string> = {
  point: 'Pointing',
  pinch: 'Drawing',
  v: 'Moving the paper',
  palm: 'Open palm',
  fist: 'Fist',
};

const MOVES = [
  {pose: 'point', name: 'Point', does: 'Moves the brush'},
  {pose: 'pinch', name: 'Pinch', does: 'Draws while held'},
  {pose: 'v', name: 'Two fingers', does: 'Moves the paper'},
  {pose: 'palm', name: 'Open palm', does: 'Opens the tools'},
  {pose: 'fist', name: 'Fist', does: 'Cancels'},
];

/** Unsaved work survives moving around the site, but not a reload. */
const kept: {strokes: Stroke[]; paper: 'white' | 'night'; brush: BrushId; color: PaintColor; size: number} = {
  strokes: [],
  paper: 'white',
  brush: 'pen',
  color: PAINT_COLORS[0],
  size: 12,
};

export default function PaintStudio() {
  const {enabled, status, message, pose, supported, preferences, enable, disable, resume, registerSurface, setPreferences} = useGestures();

  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const artRef = useRef<Artboard | null>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);

  const [tool, setTool] = useState({brush: kept.brush, color: kept.color, size: kept.size, paper: kept.paper});
  const [counts, setCounts] = useState({strokes: kept.strokes.length, redo: 0});
  const [zoom, setZoom] = useState(1);
  const [sheet, setSheet] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [file, setFile] = useState<{url: string; name: string} | null>(null);
  const [exportNote, setExportNote] = useState('');

  const toolRef = useRef(tool);
  const sheetRef = useRef(sheet);
  const inkRef = useRef({brush: kept.brush === 'eraser' ? 'pen' : kept.brush, size: kept.brush === 'eraser' ? 12 : kept.size});
  const eraserSize = useRef(ERASER_SIZES[1]);
  const drag = useRef<{zoom: number; x: number; y: number} | null>(null);
  const mouse = useRef(false);
  toolRef.current = tool;
  sheetRef.current = sheet;

  /* ── the board ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const art = new Artboard(canvas, () => setCounts({strokes: art.strokes.length, redo: art.redoStack.length}), {
      strokes: kept.strokes,
      background: PAPERS.find(p => p.id === kept.paper)!.hex,
    });
    artRef.current = art;
    setCounts({strokes: art.strokes.length, redo: art.redoStack.length});
    return () => {
      art.end();
      kept.strokes = art.strokes;
      artRef.current = null;
    };
  }, []);

  useEffect(() => {
    kept.brush = tool.brush;
    kept.color = tool.color;
    kept.size = tool.size;
    kept.paper = tool.paper;
    const art = artRef.current;
    if (art) art.background = PAPERS.find(p => p.id === tool.paper)!.hex;
  }, [tool]);

  const invalidateFile = useCallback(() => {
    setFile(current => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    setExportNote('');
  }, []);

  /* ── tool actions ──────────────────────────────────────────────────────── */

  const chooseBrush = useCallback((next: BrushId) => {
    setTool(current => {
      if (current.brush === 'eraser') eraserSize.current = current.size;
      else inkRef.current = {brush: current.brush, size: current.size};
      if (next !== 'eraser') inkRef.current.brush = next;
      return {...current, brush: next, size: next === 'eraser' ? eraserSize.current : inkRef.current.size};
    });
  }, []);

  const actions: ToolActions = {
    chooseColor: color =>
      setTool(current => {
        // Picking a colour while erasing means "draw again", not "erase in blue".
        if (current.brush !== 'eraser') return {...current, color};
        eraserSize.current = current.size;
        return {...current, color, brush: inkRef.current.brush, size: inkRef.current.size};
      }),
    chooseBrush,
    chooseSize: size =>
      setTool(current => {
        if (current.brush === 'eraser') eraserSize.current = size;
        else inkRef.current.size = size;
        return {...current, size};
      }),
    toggleErase: () => chooseBrush(toolRef.current.brush === 'eraser' ? inkRef.current.brush : 'eraser'),
    undo: () => {
      artRef.current?.undo();
      invalidateFile();
    },
    redo: () => {
      artRef.current?.redo();
      invalidateFile();
    },
    zoomBy: factor => {
      const art = artRef.current;
      if (!art) return;
      art.setView(art.view.zoom * factor);
      setZoom(art.view.zoom);
    },
    resetView: () => {
      artRef.current?.setView(1, 0, 0);
      setZoom(1);
    },
    togglePaper: () => setTool(current => ({...current, paper: current.paper === 'white' ? 'night' : 'white'})),
    setTransparent: next => setPreferences({transparent: next}),
    askClear: () => setClearing(true),
  };

  const state: ToolState = {...tool, transparent: preferences.transparent, strokes: counts.strokes, redo: counts.redo, zoom};

  /* ── the shared gesture surface ────────────────────────────────────────── */

  useEffect(() => {
    const surface: GestureSurface = {
      contains(p) {
        if (sheetRef.current) return false;
        const frame = frameRef.current?.getBoundingClientRect();
        const canvas = canvasRef.current?.getBoundingClientRect();
        if (!frame || !canvas) return false;
        return (
          p.x >= Math.max(frame.left, canvas.left) &&
          p.x <= Math.min(frame.right, canvas.right) &&
          p.y >= Math.max(frame.top, canvas.top) &&
          p.y <= Math.min(frame.bottom, canvas.bottom)
        );
      },
      begin(p) {
        const art = artRef.current;
        if (!art) return;
        const {brush, color, size} = toolRef.current;
        art.begin(art.point(p.x, p.y), brush, color.hex, size);
        invalidateFile();
      },
      move(p) {
        const art = artRef.current;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!art || !rect) return;
        // A stroke rides the edge of the paper; only letting go ends it.
        art.move(art.point(Math.min(Math.max(p.x, rect.left + 1), rect.right - 1), Math.min(Math.max(p.y, rect.top + 1), rect.bottom - 1)));
      },
      end() {
        artRef.current?.end();
      },
      pan(delta, phase) {
        const art = artRef.current;
        if (!art) return;
        if (phase === 'start') drag.current = {...art.view};
        else if (phase === 'move' && drag.current) art.setView(drag.current.zoom, drag.current.x + delta.x, drag.current.y + delta.y);
        else {
          drag.current = null;
          // React only hears about the view when the move is over.
          setZoom(art.view.zoom);
        }
      },
      zoom(scale, delta, phase) {
        const art = artRef.current;
        if (!art) return;
        if (phase === 'start') drag.current = {...art.view};
        else if (phase === 'move' && drag.current)
          art.setView(drag.current.zoom * scale, drag.current.x + delta.x, drag.current.y + delta.y);
        else {
          drag.current = null;
          setZoom(art.view.zoom);
        }
      },
      menu() {
        setSheet(open => !open);
        return true;
      },
      cancel() {
        setSheet(false);
      },
      footprint(p) {
        if (toolRef.current.brush !== 'eraser' || !this.contains(p)) return null;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;
        return Math.max(10, (toolRef.current.size / 1600) * rect.width);
      },
    };
    registerSurface(surface);
    return () => registerSurface(null);
  }, [invalidateFile, registerSurface]);

  /* ── mouse and touch ───────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || sheetRef.current) return;
      const art = artRef.current;
      if (!art) return;
      mouse.current = true;
      canvas.setPointerCapture(event.pointerId);
      const {brush, color, size} = toolRef.current;
      art.begin(art.point(event.clientX, event.clientY), brush, color.hex, size);
      invalidateFile();
      event.preventDefault();
    };
    const move = (event: PointerEvent) => {
      const art = artRef.current;
      if (mouse.current && art) art.move(art.point(event.clientX, event.clientY));
    };
    const up = () => {
      if (mouse.current) artRef.current?.end();
      mouse.current = false;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', up);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('lostpointercapture', up);
    };
  }, [invalidateFile]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      if (event.target instanceof HTMLElement && event.target.matches('input, textarea')) return;
      event.preventDefault();
      if (event.shiftKey) artRef.current?.redo();
      else artRef.current?.undo();
      invalidateFile();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [invalidateFile]);

  useEffect(() => () => setFile(current => (current && URL.revokeObjectURL(current.url), null)), []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (!new URLSearchParams(window.location.search).has('gesture-test')) return;
    const scope = window as unknown as {__paintTest?: unknown};
    scope.__paintTest = {art: artRef};
    return () => {
      delete scope.__paintTest;
    };
  }, []);

  /* ── export ────────────────────────────────────────────────────────────── */

  const prepare = async () => {
    const art = artRef.current;
    if (!art) return;
    try {
      const blob = await art.blob(preferences.transparent);
      if (file) URL.revokeObjectURL(file.url);
      const url = URL.createObjectURL(blob);
      const name = `air-drawing-${new Date().toISOString().slice(0, 10)}.png`;
      setFile({url, name});
      setExportNote('');
      // The click may fall outside the original activation; the link stays as a fallback.
      requestAnimationFrame(() => {
        const link = downloadRef.current;
        if (link) {
          link.click();
          setExportNote('Saved to your downloads. If your browser blocked it, use the link.');
        }
      });
    } catch (error) {
      setExportNote((error as Error).message);
    }
  };

  /* ── session copy ──────────────────────────────────────────────────────── */

  const reading =
    status === 'loading'
      ? 'Getting ready'
      : status === 'requesting'
        ? 'Asking for the camera'
        : status === 'paused'
          ? 'Paused'
          : status === 'error'
            ? 'Hand painting stopped'
            : status === 'tracking'
              ? READING[pose] || 'Looking for your hand'
              : 'Camera off';

  const note =
    status === 'loading'
      ? 'Loading hand tracking on this device.'
      : status === 'requesting'
        ? 'Allow camera access in your browser to start.'
        : status === 'paused'
          ? 'Capture stopped when you left this tab.'
          : status === 'error'
            ? message
            : status === 'tracking'
              ? 'The camera is read on this device. No video is recorded or uploaded.'
              : 'Draw with your mouse or finger now, or paint in the air with your hand.';

  const brushLabel = tool.brush === 'eraser' ? 'Eraser' : PAINT_BRUSHES.find(b => b.id === tool.brush)!.label;

  return (
    <div className={styles.shell} data-gesture-scope>
      <header className={styles.masthead}>
        <div>
          <h1>Paint in the air</h1>
          <p>
            Pinch your fingers together and move your hand. The paper keeps whatever you draw until you reload, and a mouse or fingertip
            works just as well.
          </p>
        </div>
        <div className={styles.save}>
          <label className={styles.link} style={{display: 'flex', gap: 8, alignItems: 'center', textDecoration: 'none'}}>
            <input type="checkbox" checked={preferences.transparent} onChange={event => actions.setTransparent(event.target.checked)} />
            No paper behind it
          </label>
          <button type="button" className={styles.button} onClick={() => void prepare()} disabled={!counts.strokes}>
            Download PNG
          </button>
          <a ref={downloadRef} className={styles.link} href={file?.url || '#'} download={file?.name} hidden={!file}>
            Save {file?.name}
          </a>
        </div>
      </header>

      <p className={styles.state} role="status" aria-live="polite">
        {exportNote}
      </p>

      <div className={styles.studio}>
        <div className={styles.board}>
          <div
            ref={frameRef}
            className={styles.frame}
            style={{['--paint-paper' as string]: PAPERS.find(p => p.id === tool.paper)!.hex, ['--paint-hint' as string]: tool.paper === 'white' ? '#7d857f' : '#8e9a92'}}
          >
            <canvas ref={canvasRef} aria-label="Drawing canvas" role="img" />
            {counts.strokes === 0 && (
              <p className={styles.welcome}>
                {brushLabel} in {tool.color.name}, {tool.size} px. Drag anywhere on the paper to start.
              </p>
            )}
          </div>

          <div className={styles.rail}>
            <PaintTools
              state={state}
              actions={actions}
              variant="rail"
              clearing={clearing}
              onClear={() => {
                artRef.current?.clear();
                setClearing(false);
                invalidateFile();
              }}
              onKeepDrawing={() => setClearing(false)}
            />
          </div>
        </div>

        <aside className={styles.margin}>
          <HandPreview />
          {status !== 'tracking' && (
            <div className={styles.placeholder}>
              <strong className={styles.reading}>{reading}</strong>
              <span>{note}</span>
            </div>
          )}
          {status === 'tracking' && (
            <div>
              <strong className={styles.reading}>{reading}</strong>
              <span className={styles.state}>{note}</span>
            </div>
          )}

          {status === 'tracking' && (
            <dl className={styles.moves}>
              {MOVES.map(move => (
                <div key={move.name} className={pose === move.pose ? styles.live : undefined}>
                  <dt>{move.name}</dt>
                  <dd>{move.does}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className={styles.sessionActions}>
            {status === 'paused' ? (
              <button type="button" className={styles.link} onClick={() => void resume()}>
                Resume hand painting
              </button>
            ) : enabled ? (
              <button type="button" className={`${styles.link} ${styles.muted}`} onClick={disable}>
                Turn off hand painting
              </button>
            ) : (
              <button type="button" className={styles.button} onClick={() => void enable()} disabled={!supported}>
                Enable hand painting
              </button>
            )}
            <Link className={styles.link} href="/photography">
              Photographs
            </Link>
          </div>
          {!supported && !enabled && (
            <small className={styles.muted}>Hand painting needs a recent Chrome, Edge, or Safari on a secure connection.</small>
          )}
        </aside>
      </div>

      {sheet && (
        <div className={styles.sheet}>
          <div className={styles.sheetPanel} data-gesture-sheet data-gesture-scope role="group" aria-label="Drawing tools">
            <div className={styles.sheetHead}>
              <span>
                {brushLabel} · {tool.color.name} · {tool.size} px
              </span>
              <button type="button" className={styles.link} onClick={() => setSheet(false)} data-gesture-close data-gesture-dwell>
                Back to the paper
              </button>
            </div>
            <PaintTools state={state} actions={actions} variant="sheet" />
          </div>
        </div>
      )}
    </div>
  );
}
