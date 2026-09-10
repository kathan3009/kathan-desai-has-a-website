"use client";

/** The master control for the camera session, next to the other site preferences. */

import {useGestures} from './GestureProvider';
import styles from './gestures.module.css';

export default function HandControlToggle() {
  const {enabled, available, status, supported, enable, disable} = useGestures();
  const busy = status === 'loading' || status === 'requesting';

  if (!available) return null;

  return (
    <span className={styles.toggleWrap}>
      <label className={styles.toggle} title={supported ? undefined : 'This browser cannot run hand tracking.'}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={!supported}
          onChange={event => {
            if (event.target.checked) void enable();
            else disable();
          }}
        />
        Hand controls
      </label>
      {busy && (
        <span className={styles.toggleNote} role="status">
          {status === 'requesting' ? 'allow camera…' : 'loading…'}
        </span>
      )}
    </span>
  );
}
