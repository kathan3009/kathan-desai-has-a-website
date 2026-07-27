"use client";

import { useRef, useEffect } from "react";
import { useSpidey } from "@/components/spidey/SpideyProvider";

const DOT_SPACING = 28;
const BASE_RADIUS = 0.8;
const MAX_RADIUS = 2.2;
const INFLUENCE_RADIUS = 120;
const BASE_ALPHA = 0.07;
const MAX_ALPHA = 0.28;

export default function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef(0);
  // In web-slinger mode the 3D lattice and halftone screen take over this layer.
  const { spidey } = useSpidey();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isTouch = window.matchMedia("(hover: none)").matches;
    if (isTouch) return;

    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const mx = mouse.current.x;
      const my = mouse.current.y;
      const cols = Math.ceil(w / DOT_SPACING) + 1;
      const rows = Math.ceil(h / DOT_SPACING) + 1;
      const influenceSq = INFLUENCE_RADIUS * INFLUENCE_RADIUS;

      for (let row = 0; row < rows; row++) {
        const y = row * DOT_SPACING;
        for (let col = 0; col < cols; col++) {
          const x = col * DOT_SPACING;
          const dx = x - mx;
          const dy = y - my;
          const distSq = dx * dx + dy * dy;

          let radius = BASE_RADIUS;
          let alpha = BASE_ALPHA;

          if (distSq < influenceSq) {
            const t = 1 - Math.sqrt(distSq) / INFLUENCE_RADIUS;
            const ease = t * t;
            radius = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * ease;
            alpha = BASE_ALPHA + (MAX_ALPHA - BASE_ALPHA) * ease;
          }

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(184,115,51,${alpha})`;
          ctx.fill();
        }
      }
    };

    const loop = () => {
      draw();
      raf.current = requestAnimationFrame(loop);
    };

    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };

    const onLeave = () => {
      mouse.current.x = -9999;
      mouse.current.y = -9999;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    raf.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [spidey]);

  if (spidey) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    />
  );
}
