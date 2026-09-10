"use client";

/** The one place on the site that shows the camera: mirrored, small, supporting. */

import {useEffect, useRef} from 'react';
import {HAND_SKELETON, useGestures} from '../gestures/GestureProvider';
import type {HandResult} from '@/lib/gestures/camera';
import styles from './paint.module.css';

export default function HandPreview() {
  const {status, registerHandFrames, videoElement} = useGestures();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef<HandResult | null>(null);

  useEffect(() => {
    registerHandFrames(result => {
      latest.current = result;
    });
    return () => registerHandFrames(null);
  }, [registerHandFrames]);

  useEffect(() => {
    if (status !== 'tracking') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frame = requestAnimationFrame(function draw() {
      frame = requestAnimationFrame(draw);
      const video = videoElement();
      const {width: w, height: h} = canvas;
      ctx.clearRect(0, 0, w, h);
      if (video && video.readyState >= 2) {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
      }
      const hands = latest.current?.landmarks || [];
      // The feed is mirrored, so landmarks are drawn at 1 - x to match it.
      hands.forEach(lm => {
        ctx.strokeStyle = 'rgba(162, 255, 223, 0.9)';
        ctx.lineWidth = 2;
        HAND_SKELETON.forEach(([a, b]) => {
          ctx.beginPath();
          ctx.moveTo((1 - lm[a].x) * w, lm[a].y * h);
          ctx.lineTo((1 - lm[b].x) * w, lm[b].y * h);
          ctx.stroke();
        });
        ctx.fillStyle = '#fff';
        lm.forEach(point => {
          ctx.beginPath();
          ctx.arc((1 - point.x) * w, point.y * h, 2.4, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [status, videoElement]);

  if (status !== 'tracking') return null;

  return (
    <div className={styles.preview}>
      <canvas ref={canvasRef} width={320} height={240} aria-label="Live view of your hand from the camera" role="img" />
    </div>
  );
}
