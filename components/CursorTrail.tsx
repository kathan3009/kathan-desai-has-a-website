"use client";

import { useRef, useEffect } from "react";

const TRAIL_LENGTH = 16;
const MAX_RADIUS = 6;
const MIN_RADIUS = 1;
const MAX_ALPHA = 0.35;

type Point = { x: number; y: number };

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useRef<Point[]>([]);
  const mouse = useRef<Point>({ x: -9999, y: -9999 });
  const raf = useRef(0);
  const active = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (window.matchMedia("(hover: none)").matches) return;

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

      if (!active.current) {
        raf.current = requestAnimationFrame(draw);
        return;
      }

      const list = points.current;
      const last = mouse.current;

      if (list.length === 0 || list[list.length - 1].x !== last.x || list[list.length - 1].y !== last.y) {
        list.push({ x: last.x, y: last.y });
        if (list.length > TRAIL_LENGTH) list.shift();
      }

      for (let i = 0; i < list.length; i++) {
        const t = i / (list.length - 1 || 1);
        const radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * t;
        const alpha = MAX_ALPHA * t * t;

        ctx.beginPath();
        ctx.arc(list[i].x, list[i].y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(184,115,51,${alpha})`;
        ctx.fill();
      }

      raf.current = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      active.current = true;
    };

    const onLeave = () => {
      active.current = false;
      points.current = [];
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    raf.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9990]"
      aria-hidden="true"
    />
  );
}
