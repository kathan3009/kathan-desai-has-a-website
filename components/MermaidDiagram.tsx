"use client";

import { useContext, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ReadingThemeContext } from "./reading/ReaderShell";
import styles from "./reading/reading.module.css";

// Mermaid's configuration is global: serialize configuration + rendering so
// simultaneous diagrams (or a theme change) cannot borrow each other's theme.
let renderQueue: Promise<void> = Promise.resolve();

function subscribeAppearance(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function darkAppearance() { return window.matchMedia("(prefers-color-scheme: dark)").matches; }
function serverAppearance() { return false; }

const palettes = {
  paper: { paper: "#ffffff", card: "#f4f4f4", ink: "#151515", line: "#777777", border: "#bdbdbd" },
  sepia: { paper: "#f4ecdb", card: "#ebe1cb", ink: "#3b3328", line: "#8a6c48", border: "#b9a88b" },
  dark: { paper: "#000000", card: "#1c1c1c", ink: "#ededed", line: "#a0a0a0", border: "#666666" },
};

export function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const preference = useContext(ReadingThemeContext);
  const systemDark = useSyncExternalStore(subscribeAppearance, darkAppearance, serverAppearance);
  const theme = preference === "paper" && systemDark ? "dark" : preference;
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [result, setResult] = useState<{ code: string; theme: string; error?: string } | null>(null);
  const current = result?.code === code && result.theme === theme ? result : null;

  useLayoutEffect(() => {
    if (!current || current.error) return;
    const drawing = ref.current?.querySelector("svg");
    if (!drawing) return;
    // Mermaid measures in a temporary container. Measure again in the visible
    // reading surface so inherited styles cannot leave nodes outside the SVG.
    const bounds = drawing.getBBox();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const padding = 16;
    const width = Math.ceil(bounds.width + padding * 2);
    const height = Math.ceil(bounds.height + padding * 2);
    drawing.setAttribute("viewBox", `${bounds.x - padding} ${bounds.y - padding} ${width} ${height}`);
    drawing.setAttribute("width", String(width));
    drawing.setAttribute("height", String(height));
    drawing.style.aspectRatio = `${width} / ${height}`;
    drawing.dataset.compact = String(width <= 720);
  }, [current]);

  useEffect(() => {
    let cancelled = false;
    renderQueue = renderQueue.catch(() => {}).then(async () => {
      if (cancelled) return;
      try {
        const { default: mermaid } = await import("mermaid");
        if (cancelled) return;
        // Use final font metrics, including on a first visit or a slow connection.
        await document.fonts.load('14px "Manrope"');
        await document.fonts.ready;
        if (cancelled) return;
        const colors = palettes[theme];
        mermaid.initialize({
          startOnLoad: false,
          htmlLabels: false,
          theme: "base",
          themeVariables: {
            darkMode: theme === "dark", background: colors.paper,
            primaryColor: colors.card, primaryTextColor: colors.ink,
            primaryBorderColor: colors.border, lineColor: colors.line,
            secondaryColor: colors.card, tertiaryColor: colors.paper,
            secondaryTextColor: colors.ink, tertiaryTextColor: colors.ink,
            textColor: colors.ink, edgeLabelBackground: colors.paper,
            clusterBkg: colors.paper, clusterBorder: colors.border,
            fontSize: "14px",
          },
          securityLevel: "loose",
          fontFamily: "Manrope, system-ui, sans-serif",
          suppressErrorRendering: true,
          flowchart: { useMaxWidth: false, nodeSpacing: 24, rankSpacing: 28, padding: 12, htmlLabels: false, curve: "linear" },
          sequence: { useMaxWidth: false },
        });
        const { svg, bindFunctions } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          bindFunctions?.(ref.current);
          setResult({ code, theme });
        }
      } catch (error) {
        if (!cancelled) {
          if (ref.current) ref.current.innerHTML = "";
          setResult({ code, theme, error: error instanceof Error ? error.message : "Diagram render failed" });
        }
      }
    });
    return () => { cancelled = true; };
  }, [code, theme, id]);

  return <figure className={styles.diagram} aria-label="Article diagram" aria-busy={!current}>
    {!current && <p role="status" className={styles.diagramNote}>Rendering diagram…</p>}
    <div ref={ref} className={styles.diagramCanvas} hidden={!current || !!current.error} tabIndex={0} role="region" aria-label="Scrollable diagram" />
    {current?.error && <p role="status" className={styles.diagramNote}>This diagram could not be displayed. Its source is available below.</p>}
    <details className={styles.diagramSource} open={current?.error ? true : undefined}>
      <summary>Diagram source</summary>
      <pre tabIndex={0}><code>{code}</code></pre>
    </details>
  </figure>;
}
