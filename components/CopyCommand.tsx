"use client";
import { useState } from "react";

/* A terminal snippet with a copy button; the status is announced for screen readers. */
export default function CopyCommand({ command }: { command: string }) {
  const [status, setStatus] = useState("");
  const copy = async () => {
    try { await navigator.clipboard.writeText(command); setStatus("Copied"); }
    catch { setStatus("Select the text to copy it"); }
    setTimeout(() => setStatus(""), 2400);
  };
  return <div className="copy-command">
    <pre><code>{command}</code></pre>
    <button type="button" onClick={copy} aria-label="Copy the install commands">{status === "Copied" ? "Copied" : "Copy"}</button>
    <span className="copy-command-status" role="status">{status}</span>
  </div>;
}
