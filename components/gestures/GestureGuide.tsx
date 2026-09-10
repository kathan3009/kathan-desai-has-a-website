"use client";

/**
 * A nonmodal panel, never a dialog: it explains the gestures, reports honestly
 * what the camera is doing, and always keeps a way to stop within reach.
 */

import Link from 'next/link';
import {useState} from 'react';
import {usePathname} from 'next/navigation';
import {useGestures} from './GestureProvider';
import styles from './gestures.module.css';

const READING: Record<string, string> = {
  point: 'Pointing',
  pinch: 'Pinching',
  v: 'Two fingers',
  palm: 'Open palm',
  fist: 'Fist',
};

const MOVES = {
  browse: [
    {pose: 'point', name: 'Point', does: 'Highlights whatever is under your fingertip'},
    {pose: 'pinch', name: 'Pinch, let go', does: 'Opens the highlighted link or button'},
    {pose: 'v', name: 'Two fingers', does: 'Move up or down to scroll; back to the middle stops'},
    {pose: 'palm', name: 'Open palm', does: 'Shows and hides this guide'},
    {pose: 'fist', name: 'Fist', does: 'Cancels, or closes what is open'},
  ],
  paint: [
    {pose: 'point', name: 'Point', does: 'Moves the brush over the paper'},
    {pose: 'pinch', name: 'Pinch, let go', does: 'Draws while you hold the pinch'},
    {pose: 'v', name: 'Two fingers', does: 'Moves the paper around'},
    {pose: 'palm', name: 'Open palm', does: 'Opens the drawing tools'},
    {pose: 'fist', name: 'Fist', does: 'Cancels the stroke, or closes the tools'},
  ],
};

export default function GestureGuide() {
  const {enabled, status, mode, message, pose, guideOpen, preferences, disable, resume, enable, openGuide, minimizeGuide, dismissError, setPreferences} =
    useGestures();
  const [settings, setSettings] = useState(false);
  const pathname = usePathname() || '/';

  // Paint carries its own status, help, and controls in the page itself.
  if (pathname === '/paint') return null;
  if (!enabled && status !== 'error') return null;

  const reading =
    status === 'loading'
      ? 'Getting ready'
      : status === 'requesting'
        ? 'Asking for the camera'
        : status === 'paused'
          ? 'Paused'
          : status === 'error'
            ? 'Hand controls stopped'
            : READING[pose] || 'Looking for your hand';

  const state =
    status === 'loading'
      ? 'Loading hand tracking on this device.'
      : status === 'requesting'
        ? 'Allow camera access in your browser to start.'
        : status === 'paused'
          ? 'Capture stopped when you left this tab.'
          : status === 'error'
            ? message
            : mode === 'paint'
              ? 'Camera on. Pinch over the paper to draw.'
              : 'Camera on. Point at anything to highlight it.';

  if (status === 'error')
    return (
      <aside className={`${styles.guide} ${styles.glass}`} aria-label="Hand control guide" data-gesture-scope>
        <strong className={styles.reading}>{reading}</strong>
        <span className={styles.state} role="status">
          {state}
        </span>
        <div className={styles.retry}>
          <button type="button" className={styles.link} onClick={() => void enable()}>
            Try again
          </button>
          <button type="button" className={`${styles.link} ${styles.stop}`} onClick={dismissError}>
            Not now
          </button>
        </div>
      </aside>
    );

  if (!guideOpen)
    return (
      <aside className={`${styles.chip} ${styles.glass}`} aria-label="Hand control guide" data-gesture-scope>
        <strong className={styles.chipReading}>{reading}</strong>
        <span className={styles.spacer} />
        {status === 'paused' ? (
          <button type="button" className={styles.link} onClick={() => void resume()} data-gesture-dwell>
            Resume
          </button>
        ) : (
          <button type="button" className={styles.link} onClick={openGuide} data-gesture-dwell>
            Help
          </button>
        )}
        <button type="button" className={`${styles.link} ${styles.stop}`} onClick={disable} data-gesture-dwell>
          Turn off
        </button>
      </aside>
    );

  return (
    <aside className={`${styles.guide} ${styles.glass}`} aria-label="Hand control guide" data-gesture-scope>
      <strong className={styles.reading}>{reading}</strong>
      <span className={styles.state} role="status">
        {state}
      </span>

      {status === 'paused' ? (
        <div className={styles.retry}>
          <button type="button" className={styles.link} onClick={() => void resume()} data-gesture-dwell>
            Resume hand controls
          </button>
          <button type="button" className={`${styles.link} ${styles.stop}`} onClick={disable}>
            Turn off
          </button>
        </div>
      ) : (
        <>
          <dl className={styles.moves}>
            {MOVES[mode].map(move => (
              <div key={move.name} className={pose === move.pose ? styles.live : undefined}>
                <dt>{move.name}</dt>
                <dd>{move.does}</dd>
              </div>
            ))}
          </dl>
          <small className={styles.privacy}>The camera is read on this device. No video is recorded or uploaded.</small>
        </>
      )}

      {settings && enabled && (
        <div className={styles.settings}>
          <div>
            <span>Pointer hand</span>
            <div className={styles.choices}>
              {(['Right', 'Left'] as const).map(hand => (
                <button
                  key={hand}
                  type="button"
                  aria-pressed={preferences.hand === hand}
                  onClick={() => setPreferences({hand})}
                  data-gesture-dwell
                >
                  {hand}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span>Scroll speed</span>
            <div className={styles.choices}>
              {(['gentle', 'steady', 'quick'] as const).map(speed => (
                <button
                  key={speed}
                  type="button"
                  aria-pressed={preferences.scrollSpeed === speed}
                  onClick={() => setPreferences({scrollSpeed: speed})}
                  data-gesture-dwell
                >
                  {speed[0].toUpperCase() + speed.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span>Scroll direction</span>
            <div className={styles.choices}>
              {[false, true].map(reverse => (
                <button
                  key={String(reverse)}
                  type="button"
                  aria-pressed={preferences.reverse === reverse}
                  onClick={() => setPreferences({reverse})}
                  data-gesture-dwell
                >
                  {reverse ? 'Reversed' : 'Normal'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <Link className={styles.link} href="/paint">
          Paint
        </Link>
        <button type="button" className={styles.link} aria-expanded={settings} onClick={() => setSettings(!settings)} data-gesture-dwell>
          Settings
        </button>
        <span className={styles.spacer} />
        <button type="button" className={styles.link} onClick={minimizeGuide} data-gesture-dwell>
          Minimize
        </button>
        <button type="button" className={`${styles.link} ${styles.stop}`} onClick={disable} data-gesture-dwell>
          Turn off
        </button>
      </div>
    </aside>
  );
}
