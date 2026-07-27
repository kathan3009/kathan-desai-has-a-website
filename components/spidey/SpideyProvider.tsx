"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import WebCast from "./WebCast";

export const SPIDEY_STORAGE_KEY = "web-slinger-mode";
const SPIDEY_EVENT = "spidey:change";

type Origin = { x: number; y: number };

type SpideyContextValue = {
  /** Whether web-slinger mode is currently on. */
  spidey: boolean;
  /** Whether the web-cast transition is mid-flight. */
  casting: boolean;
  /** Flip the mode. Pass the click origin so the web casts from there. */
  toggle: (origin?: Origin) => void;
};

const SpideyContext = createContext<SpideyContextValue>({
  spidey: false,
  casting: false,
  toggle: () => {},
});

export const useSpidey = () => useContext(SpideyContext);

/**
 * The `data-theme` attribute is the single source of truth — the inline head
 * script sets it before first paint, and React subscribes to it rather than
 * keeping a second copy that could disagree.
 */
function applyTheme(on: boolean) {
  const root = document.documentElement;
  if (on) {
    root.dataset.theme = "spidey";
  } else {
    delete root.dataset.theme;
  }
  try {
    localStorage.setItem(SPIDEY_STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* private mode — mode still applies for this session */
  }
  window.dispatchEvent(new Event(SPIDEY_EVENT));
}

const subscribe = (onChange: () => void) => {
  window.addEventListener(SPIDEY_EVENT, onChange);
  return () => window.removeEventListener(SPIDEY_EVENT, onChange);
};
const readTheme = () => document.documentElement.dataset.theme === "spidey";
const readServerTheme = () => false;

export default function SpideyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const spidey = useSyncExternalStore(subscribe, readTheme, readServerTheme);
  const [cast, setCast] = useState<{ origin: Origin; to: boolean } | null>(null);
  const busy = useRef(false);

  const toggle = useCallback(
    (origin?: Origin) => {
      if (busy.current) return;
      const next = !readTheme();

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduced || !origin) {
        applyTheme(next);
        return;
      }

      busy.current = true;
      setCast({ origin, to: next });
    },
    []
  );

  const handleFlip = useCallback((to: boolean) => {
    applyTheme(to);
  }, []);

  const handleDone = useCallback(() => {
    busy.current = false;
    setCast(null);
  }, []);

  return (
    <SpideyContext.Provider value={{ spidey, casting: cast !== null, toggle }}>
      {children}
      {cast && (
        <WebCast
          origin={cast.origin}
          to={cast.to}
          onFlip={handleFlip}
          onDone={handleDone}
        />
      )}
    </SpideyContext.Provider>
  );
}
