"use client";

import { useEffect, useRef, useState } from "react";

type Props = { code: string };

export function MermaidDiagram({ code }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "inherit",
        });
        const id = "mermaid-" + Math.random().toString(36).slice(2, 9);
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Diagram render failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="my-6 p-4 border border-border rounded bg-card">
        <p className="text-sm text-muted">Diagram could not render: {error}</p>
        <pre className="text-xs mt-2 overflow-x-auto text-muted">{code}</pre>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="my-6 flex justify-center overflow-x-auto rounded border border-border bg-card p-4"
    />
  );
}
