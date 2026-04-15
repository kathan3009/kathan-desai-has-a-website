"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const MAGIC_WORD = "abracadabra";
const PAGES = ["about", "work", "projects", "blogs", "photography"];

const HACK_SEQUENCE = [
  { text: "[*] Initializing Pentest Copilot v2.1.0...", delay: 400 },
  { text: "[*] Target acquired: visitor.terminal", delay: 300 },
  { text: "[*] Scanning open ports.............. done", delay: 800 },
  { text: "[+] Port 80   \u2014 HTTP     [OPEN]", delay: 150 },
  { text: "[+] Port 443  \u2014 HTTPS    [OPEN]", delay: 150 },
  { text: "[+] Port 8080 \u2014 HTTP-ALT [FILTERED]", delay: 150 },
  { text: "[*] Running vulnerability assessment...", delay: 700 },
  { text: "[+] CVE-2026-0420: Excessive curiosity   [HIGH]", delay: 350 },
  { text: "[+] CVE-2026-0421: Developer mindset      [CRITICAL]", delay: 350 },
  { text: "[*] Attempting exploitation...", delay: 800 },
  { text: "[!] Shell access obtained.", delay: 500 },
  { text: "[!] Extracting secrets...", delay: 600 },
  { text: '[*] Found: kathan.is = "pretty cool"', delay: 400 },
  { text: "[*] Pentest complete. You passed.", delay: 300 },
  { text: "[*] Full report \u2192 https://bugbase.in", delay: 0 },
];

const MATRIX_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789@#$%^&*(){}[]|;:<>,.?/~`\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B3";

function randomMatrixLine(width: number): string {
  let s = "";
  for (let i = 0; i < width; i++) {
    s += Math.random() > 0.3 ? MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)] : " ";
  }
  return s;
}

export default function KonamiTerminal() {
  const [active, setActive] = useState(false);
  const [lines, setLines] = useState<Array<{ text: string; type: "output" | "cmd" | "matrix" | "hack" }>>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const keyBuffer = useRef("");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const router = useRouter();

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (active) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.length !== 1) return;
      keyBuffer.current = (keyBuffer.current + e.key.toLowerCase()).slice(-MAGIC_WORD.length);
      if (keyBuffer.current === MAGIC_WORD) {
        setActive(true);
        setLines([
          { text: " \u2588\u2588\u2588 ACCESS GRANTED \u2588\u2588\u2588", type: "hack" },
          { text: "", type: "output" },
          { text: "Welcome to kathan@portfolio. Type 'help' for commands.", type: "output" },
          { text: "", type: "output" },
        ]);
        keyBuffer.current = "";
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active]);

  useEffect(() => {
    if (active && inputRef.current) inputRef.current.focus();
  }, [active, busy]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const addLine = useCallback((text: string, type: "output" | "cmd" | "matrix" | "hack" = "output") => {
    setLines((prev) => [...prev, { text, type }]);
  }, []);

  const runHack = useCallback(() => {
    setBusy(true);
    addLine("> hack", "cmd");
    let elapsed = 0;
    HACK_SEQUENCE.forEach(({ text, delay }, i) => {
      elapsed += delay;
      const t = setTimeout(() => {
        addLine(text, "hack");
        if (i === HACK_SEQUENCE.length - 1) {
          addLine("", "output");
          setBusy(false);
        }
      }, elapsed);
      timersRef.current.push(t);
    });
  }, [addLine]);

  const runMatrix = useCallback(() => {
    setBusy(true);
    addLine("> matrix", "cmd");
    const cols = 50;
    const totalFrames = 30;
    let frame = 0;
    const interval = setInterval(() => {
      addLine(randomMatrixLine(cols), "matrix");
      frame++;
      if (frame >= totalFrames) {
        clearInterval(interval);
        addLine("", "output");
        addLine("Wake up...", "hack");
        addLine("The Matrix has you...", "hack");
        addLine("Follow the white rabbit. \uD83D\uDC07", "hack");
        addLine("", "output");
        setBusy(false);
      }
    }, 80);
    timersRef.current.push(interval as unknown as ReturnType<typeof setTimeout>);
  }, [addLine]);

  const handleCommand = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim().toLowerCase();
      if (!trimmed) return;

      switch (trimmed) {
        case "help":
          addLine(`> ${cmd}`, "cmd");
          addLine("AVAILABLE COMMANDS:", "output");
          addLine("  whoami    \u2014 who is kathan?", "output");
          addLine("  ls        \u2014 list pages", "output");
          addLine("  cd <page> \u2014 navigate (e.g. cd blogs)", "output");
          addLine("  hack      \u2014 run a pentest simulation", "output");
          addLine("  matrix    \u2014 take the red pill", "output");
          addLine("  clear     \u2014 clear terminal", "output");
          addLine("  exit      \u2014 close terminal", "output");
          addLine("", "output");
          break;
        case "whoami":
          addLine(`> ${cmd}`, "cmd");
          addLine("Kathan Desai", "hack");
          addLine("Co-Founder & COO @ BugBase", "output");
          addLine("Building Pentest Copilot \u2014 AI for autonomous pentesting", "output");
          addLine("Based in San Francisco & New Delhi", "output");
          addLine("Dropped out at 20 to build.", "output");
          addLine("", "output");
          break;
        case "ls":
          addLine(`> ${cmd}`, "cmd");
          addLine("about/  work/  projects/  blogs/  photography/", "output");
          addLine("", "output");
          break;
        case "clear":
          setLines([]);
          break;
        case "exit":
          clearTimers();
          setActive(false);
          setLines([]);
          setBusy(false);
          break;
        case "hack":
          runHack();
          break;
        case "matrix":
          runMatrix();
          break;
        case "sudo rm -rf /":
          addLine(`> ${cmd}`, "cmd");
          addLine("Nice try. \uD83D\uDE0F", "hack");
          addLine("", "output");
          break;
        default:
          if (trimmed.startsWith("cd ")) {
            const page = trimmed.slice(3).replace(/\//g, "").trim();
            addLine(`> ${cmd}`, "cmd");
            if (page === "~" || page === "" || page === "/") {
              addLine("Navigating to / ...", "output");
              addLine("", "output");
              setTimeout(() => {
                router.push("/");
                clearTimers();
                setActive(false);
                setLines([]);
                setBusy(false);
              }, 500);
            } else if (PAGES.includes(page)) {
              addLine(`Navigating to /${page} ...`, "output");
              addLine("", "output");
              setTimeout(() => {
                router.push(`/${page}`);
                clearTimers();
                setActive(false);
                setLines([]);
                setBusy(false);
              }, 500);
            } else {
              addLine(`bash: cd: ${page}: No such file or directory`, "output");
              addLine("", "output");
            }
          } else {
            addLine(`> ${cmd}`, "cmd");
            addLine(`command not found: ${trimmed}`, "output");
            addLine("Type 'help' for available commands.", "output");
            addLine("", "output");
          }
      }
    },
    [addLine, router, runHack, runMatrix, clearTimers],
  );

  const close = useCallback(() => {
    clearTimers();
    setActive(false);
    setLines([]);
    setBusy(false);
  }, [clearTimers]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-label="Terminal"
    >
      <div className="w-full max-w-2xl h-[70vh] bg-[#0d0d0d] border border-[#333] rounded-lg shadow-2xl flex flex-col font-mono text-sm overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#222] bg-[#141414] shrink-0">
          <button type="button" onClick={close} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors" aria-label="Close" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-[#555] text-xs select-none">kathan@portfolio &mdash; zsh</span>
        </div>

        {/* Terminal output */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          {lines.map((line, i) => (
            <div
              key={i}
              className={
                line.type === "cmd"
                  ? "text-[#b87333]"
                  : line.type === "hack"
                    ? "text-[#4ade80]"
                    : line.type === "matrix"
                      ? "text-[#22c55e]/60 text-xs leading-none"
                      : "text-[#a8a29e]"
              }
            >
              {line.text || "\u00A0"}
            </div>
          ))}

          {/* Input line */}
          {!busy && (
            <div className="flex items-center mt-0.5">
              <span className="text-[#b87333] mr-2 select-none">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCommand(input);
                    setInput("");
                  } else if (e.key === "Escape") {
                    close();
                  }
                }}
                className="flex-1 bg-transparent text-[#a8a29e] outline-none caret-[#b87333]"
                autoFocus
                spellCheck={false}
                autoComplete="off"
                aria-label="Terminal input"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
