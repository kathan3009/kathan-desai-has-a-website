"use client";

import { useState, useEffect, useRef } from "react";

const ZONES = [
  { label: "New Delhi", tz: "Asia/Kolkata", abbr: "IST" },
  { label: "San Francisco", tz: "America/Los_Angeles", abbr: "PT" },
] as const;

type TimeInfo = {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  period: string;
};

function getTimeInfo(tz: string): TimeInfo {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(now);

  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
  const s = parseInt(parts.find((p) => p.type === "second")?.value ?? "0");
  const period = parts.find((p) => p.type === "dayPeriod")?.value ?? "";

  const hStr = h.toString();
  const mStr = m.toString().padStart(2, "0");

  return { hours: h, minutes: m, seconds: s, formatted: `${hStr}:${mStr}`, period };
}

function AnalogClock({ hours, minutes, seconds }: { hours: number; minutes: number; seconds: number }) {
  const h24 = hours % 12;
  const hourDeg = h24 * 30 + minutes * 0.5;
  const minuteDeg = minutes * 6;
  const secondDeg = seconds * 6;

  return (
    <svg viewBox="0 0 100 100" className="w-20 h-20 sm:w-24 sm:h-24">
      {/* Face */}
      <circle cx="50" cy="50" r="46" fill="none" stroke="var(--border)" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="44" fill="var(--card)" opacity="0.5" />

      {/* Hour markers */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const major = i % 3 === 0;
        const r1 = major ? 36 : 38;
        const r2 = 42;
        return (
          <line
            key={i}
            x1={50 + r1 * Math.cos(angle)}
            y1={50 + r1 * Math.sin(angle)}
            x2={50 + r2 * Math.cos(angle)}
            y2={50 + r2 * Math.sin(angle)}
            stroke={major ? "var(--foreground)" : "var(--muted)"}
            strokeWidth={major ? "1.5" : "0.75"}
            strokeLinecap="round"
            opacity={major ? 0.6 : 0.3}
          />
        );
      })}

      {/* Hour hand */}
      <line
        x1="50" y1="50"
        x2="50" y2="24"
        stroke="var(--foreground)"
        strokeWidth="2"
        strokeLinecap="round"
        transform={`rotate(${hourDeg} 50 50)`}
      />

      {/* Minute hand */}
      <line
        x1="50" y1="50"
        x2="50" y2="16"
        stroke="var(--foreground)"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.7"
        transform={`rotate(${minuteDeg} 50 50)`}
      />

      {/* Second hand */}
      <line
        x1="50" y1="54"
        x2="50" y2="18"
        stroke="var(--accent)"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.6"
        transform={`rotate(${secondDeg} 50 50)`}
      />

      {/* Center dot */}
      <circle cx="50" cy="50" r="2" fill="var(--accent)" opacity="0.7" />
    </svg>
  );
}

export default function TimeZones() {
  const [infos, setInfos] = useState<Record<string, TimeInfo>>({});
  const raf = useRef(0);

  useEffect(() => {
    const tick = () => {
      const next: Record<string, TimeInfo> = {};
      for (const z of ZONES) next[z.tz] = getTimeInfo(z.tz);
      setInfos(next);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  if (Object.keys(infos).length === 0) return null;

  return (
    <section className="mb-6 sm:mb-8">
      <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-8">Local Time</h2>
      <div className="flex gap-10 sm:gap-16">
        {ZONES.map((z) => {
          const info = infos[z.tz];
          if (!info) return null;
          return (
            <div key={z.tz} className="flex items-center gap-4">
              <AnalogClock hours={info.hours} minutes={info.minutes} seconds={info.seconds} />
              <div>
                <p className="font-mono text-xl sm:text-2xl tabular-nums tracking-tight text-foreground leading-none">
                  {info.formatted}
                  <span className="text-muted text-xs sm:text-sm ml-1 font-normal">{info.period}</span>
                </p>
                <p className="text-muted text-sm mt-1.5">{z.label}</p>
                <p className="text-muted/50 text-xs font-mono mt-0.5">{z.abbr}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
