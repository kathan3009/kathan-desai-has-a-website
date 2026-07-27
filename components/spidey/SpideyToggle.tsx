"use client";

import { useRef } from "react";
import { useSpidey } from "./SpideyProvider";

/** Orb-weaver glyph: eight anchors, three sagging spiral rings. */
const { radials, rings } = (() => {
  const cx = 12;
  const cy = 12;
  const spokes = 8;
  const ringCount = 3;
  const reach = 9.2;

  const node = (ring: number, spoke: number) => {
    const angle = (spoke / spokes) * Math.PI * 2 - Math.PI / 2;
    const r = (reach * (ring + 1)) / ringCount;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
  };

  const radials = Array.from({ length: spokes }, (_, s) => {
    const [x, y] = node(ringCount - 1, s);
    return `M${cx} ${cy}L${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join("");

  const rings = Array.from({ length: ringCount }, (_, ring) =>
    Array.from({ length: spokes }, (_, s) => {
      const [ax, ay] = node(ring, s);
      const [bx, by] = node(ring, (s + 1) % spokes);
      // Pull the midpoint toward the hub so each thread sags.
      const qx = (ax + bx) / 2 + (cx - (ax + bx) / 2) * 0.2;
      const qy = (ay + by) / 2 + (cy - (ay + by) / 2) * 0.2;
      return `M${ax.toFixed(2)} ${ay.toFixed(2)}Q${qx.toFixed(2)} ${qy.toFixed(
        2
      )} ${bx.toFixed(2)} ${by.toFixed(2)}`;
    }).join("")
  ).join("");

  return { radials, rings };
})();

export default function SpideyToggle({ className = "" }: { className?: string }) {
  const { spidey, casting, toggle } = useSpidey();
  const ref = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    const rect = ref.current?.getBoundingClientRect();
    toggle(
      rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : undefined
    );
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      disabled={casting}
      aria-pressed={spidey}
      title={spidey ? "Turn off web-slinger mode" : "Turn on web-slinger mode"}
      className={`web-toggle shrink-0 ${className}`}
    >
      <span className="sense-ring" aria-hidden />
      <span className="sense-ring" aria-hidden />
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        aria-hidden
      >
        <path d={radials} opacity="0.85" />
        <path d={rings} />
      </svg>
      <span className="sr-only">
        Web-slinger mode {spidey ? "on" : "off"}
      </span>
    </button>
  );
}
