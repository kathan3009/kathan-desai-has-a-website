"use client";

import Link from "next/link";
import { createContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import ReadingProgress from "@/components/ReadingProgress";
import { defaultPreferences, parsePreferences, READING_KEY, type ReadingPreferences } from "./preferences";
import styles from "./reading.module.css";

export const ReadingThemeContext = createContext<ReadingPreferences["theme"]>("paper");
const CHANGE_EVENT = "kathan-reading-change";
let memoryPreferences: string | null = null;
let storageBlocked = false;

function snapshot() {
  if (storageBlocked) return memoryPreferences;
  try { return window.localStorage.getItem(READING_KEY); }
  catch { return memoryPreferences; }
}
function serverSnapshot() { return null; }
function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === READING_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function persistPreferences(preferences: ReadingPreferences): boolean {
  memoryPreferences = JSON.stringify(preferences);
  try {
    window.localStorage.setItem(READING_KEY, memoryPreferences);
    storageBlocked = false;
  } catch {
    storageBlocked = true;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return !storageBlocked;
}

export function ReaderShell({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const prefs = useMemo(() => parsePreferences(raw), [raw]);
  const [saveFailed, setSaveFailed] = useState(false);
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);

  function update(changes: Partial<ReadingPreferences>) {
    setSaveFailed(!persistPreferences({ ...prefs, ...changes }));
  }

  useEffect(() => {
    function close(restoreFocus: boolean) {
      if (!details.current?.open) return;
      details.current.open = false;
      if (restoreFocus) summary.current?.focus();
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && details.current?.open) {
        event.preventDefault();
        close(true);
      }
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable=true]")) return;
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        if (details.current) details.current.open = !details.current.open;
        summary.current?.focus();
      }
    };
    const pointerdown = (event: PointerEvent) => {
      if (event.target instanceof Node && !details.current?.contains(event.target)) {
        close(!!details.current?.contains(document.activeElement));
      }
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", pointerdown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", pointerdown);
    };
  }, []);

  const variables = {
    "--reading-size": `${prefs.size}px`,
    "--reading-width": { narrow: "35rem", standard: "43rem", wide: "50rem" }[prefs.width],
    "--reading-line": { compact: "1.5", relaxed: "1.75", spacious: "2" }[prefs.spacing],
    "--reading-face": prefs.typeface === "serif"
      ? 'var(--font-newsreader, "Newsreader"), Georgia, serif'
      : 'var(--font-manrope, "Manrope"), system-ui, sans-serif',
  } as CSSProperties;

  return (
    <ReadingThemeContext.Provider value={prefs.theme}>
      <div className={`${styles.surface} ${styles.reader}`} data-reading-theme={prefs.theme} style={variables}>
        <ReadingProgress targetId="reading-article" />
        <a href="#reading-article" className={styles.skipLink}>Skip to article</a>
        <div className={styles.toolbar}>
          <Link href="/blogs" className={styles.backLink}><span aria-hidden="true">←</span> All writing</Link>
          <details className={styles.settings} ref={details}>
            <summary ref={summary} aria-controls="reading-settings" aria-keyshortcuts="Alt+R">
              <span className={styles.aa} aria-hidden="true">Aa</span> Reading settings
            </summary>
            <section id="reading-settings" className={styles.settingsPanel} aria-labelledby="reading-settings-title">
              <div className={styles.settingsHeading}>
                <h2 id="reading-settings-title">Make yourself comfortable</h2>
                <button type="button" aria-label="Close reading settings" onClick={() => {
                  if (details.current) details.current.open = false;
                  summary.current?.focus();
                }}>×</button>
              </div>
              <fieldset><legend>Page colour</legend><div className={styles.choices}>
                {(["paper", "sepia", "dark"] as const).map(theme => (
                  <button type="button" key={theme} aria-pressed={prefs.theme === theme} onClick={() => update({ theme })}>
                    <span className={styles.swatch} data-swatch={theme} aria-hidden="true" />{theme[0].toUpperCase() + theme.slice(1)}
                  </button>
                ))}
              </div></fieldset>
              <div className={styles.sizeRow}><span id="reading-size-label">Text size</span><div className={styles.sizeControls} role="group" aria-labelledby="reading-size-label">
                <button type="button" aria-label="Smaller text" disabled={prefs.size <= 18} onClick={() => update({ size: Math.max(18, prefs.size - 2) })}>−</button>
                <output aria-live="polite" aria-label="Text size">{prefs.size}px</output>
                <button type="button" aria-label="Larger text" disabled={prefs.size >= 30} onClick={() => update({ size: Math.min(30, prefs.size + 2) })}>+</button>
              </div></div>
              <fieldset><legend>Typeface</legend><div className={styles.choices}>
                <button type="button" aria-pressed={prefs.typeface === "serif"} onClick={() => update({ typeface: "serif" })}>Serif</button>
                <button type="button" aria-pressed={prefs.typeface === "sans"} onClick={() => update({ typeface: "sans" })}>Sans serif</button>
              </div></fieldset>
              <fieldset><legend>Column width</legend><div className={styles.choices}>
                {(["narrow", "standard", "wide"] as const).map(width => <button type="button" key={width} aria-pressed={prefs.width === width} onClick={() => update({ width })}>{width[0].toUpperCase() + width.slice(1)}</button>)}
              </div></fieldset>
              <fieldset><legend>Line spacing</legend><div className={styles.choices}>
                {(["compact", "relaxed", "spacious"] as const).map(spacing => <button type="button" key={spacing} aria-pressed={prefs.spacing === spacing} onClick={() => update({ spacing })}>{spacing[0].toUpperCase() + spacing.slice(1)}</button>)}
              </div></fieldset>
              <button type="button" className={styles.reset} onClick={() => update(defaultPreferences)}>Reset preferences</button>
              <p className={styles.settingsNote} role="status">{saveFailed ? "Applied for this visit. Your browser could not save preferences." : "Preferences are saved on this device."}</p>
              <p className={styles.settingsNote}>Alt + R opens settings. Escape closes them.</p>
            </section>
          </details>
        </div>
        {children}
      </div>
    </ReadingThemeContext.Provider>
  );
}
