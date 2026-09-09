"use client";

import { useState, useEffect } from "react";
import styles from "./reading/reading.module.css";

export default function ReadingProgress({ targetId }: { targetId?: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const target = targetId ? document.getElementById(targetId) : document.documentElement;
    if (!target) return;
    let frame = 0;
    let active = true;
    const update = () => {
      frame = 0;
      const rect = target.getBoundingClientRect();
      const start = targetId ? rect.top + window.scrollY : 0;
      const height = targetId ? rect.height : document.documentElement.scrollHeight;
      const distance = height - window.innerHeight;
      const ratio = distance <= 0 ? (rect.bottom <= window.innerHeight ? 1 : 0) : (window.scrollY - start) / distance;
      setProgress(Math.round(Math.min(1, Math.max(0, ratio)) * 100));
    };
    const schedule = () => { if (active && !frame) frame = requestAnimationFrame(update); };
    update();
    const observer = new ResizeObserver(schedule);
    observer.observe(target);
    // Images, diagrams, font changes and settings all change the actual article height.
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.fonts.ready.then(schedule);
    return () => {
      active = false;
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [targetId]);

  return (
    <div className={styles.progress} role="progressbar" aria-label="Reading progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ transform: `scaleX(${progress / 100})` }} />
    </div>
  );
}
