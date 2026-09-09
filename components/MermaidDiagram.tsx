"use client";

import { useContext, useEffect, useId, useRef, useState } from "react";
import { ReadingThemeContext } from "./reading/ReaderShell";
import styles from "./reading/reading.module.css";

// Mermaid's configuration is global: serialize configuration + rendering so
// simultaneous diagrams (or a theme change) cannot borrow each other's theme.
let renderQueue: Promise<void> = Promise.resolve();

export function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useContext(ReadingThemeContext);
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [result, setResult] = useState<{ code: string; theme: string; error?: string } | null>(null);
  const current = result?.code === code && result.theme === theme ? result : null;

  useEffect(() => {
    let cancelled = false;
    renderQueue = renderQueue.catch(() => {}).then(async () => {
      if (cancelled) return;
      try {
        const { default: mermaid } = await import("mermaid");
        if (cancelled) return;
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === "dark" ? "dark" : "default",
          securityLevel: "loose",
          fontFamily: "Manrope, system-ui, sans-serif",
          suppressErrorRendering: true,
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
