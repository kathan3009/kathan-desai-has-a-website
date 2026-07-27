"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient depth layer for web-slinger mode: three orb-weaver lattices hung at
 * different depths, drifting at different rates, with the camera parallaxing
 * toward the cursor. You are looking *through* webbing, not at a picture of it.
 *
 * three.js is loaded on demand, so the default site never pays for it.
 */

type ThreeNS = typeof import("three");
type ThreeGroup = InstanceType<ThreeNS["Group"]>;

type LayerSpec = {
  /** Hub position. Kept off-centre and off-axis so no two webs share a centre —
   *  you see fragments of webbing at different depths, not one bullseye. */
  x: number;
  y: number;
  z: number;
  radius: number;
  spokes: number;
  rings: number;
  spin: number;
  color: number;
  opacity: number;
  dots: number;
};

const LAYERS: LayerSpec[] = [
  { x: -6.4, y: 3.2, z: -1.5, radius: 4.4, spokes: 13, rings: 6, spin: 0.019, color: 0x24e8de, opacity: 0.18, dots: 0.022 },
  { x: 8.6, y: -4.4, z: -6.0, radius: 9.0, spokes: 17, rings: 8, spin: -0.012, color: 0x2b54ff, opacity: 0.22, dots: 0.04 },
  { x: -3.5, y: -10.5, z: -12.0, radius: 17.0, spokes: 21, rings: 10, spin: 0.007, color: 0xf0303e, opacity: 0.15, dots: 0.055 },
];

export default function WebLattice() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let teardown = () => {};

    (async () => {
      const THREE = await import("three");
      const host = hostRef.current;
      if (disposed || !host) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const small = window.innerWidth < 640;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        58,
        window.innerWidth / window.innerHeight,
        0.1,
        120
      );
      camera.position.z = 6;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !small,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.75));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearAlpha(0);
      host.appendChild(renderer.domElement);

      const disposables: { dispose: () => void }[] = [];
      const groups: { group: ThreeGroup; spin: number }[] = [];

      // Deterministic per-node wobble keeps each web organic but stable.
      const wobble = (a: number, b: number) =>
        Math.sin(a * 12.9898 + b * 78.233) * 0.5 + 0.5;

      for (const spec of LAYERS) {
        const spokes = small ? Math.max(8, Math.round(spec.spokes * 0.65)) : spec.spokes;
        const rings = small ? Math.max(5, Math.round(spec.rings * 0.7)) : spec.rings;

        const node = (ring: number, spoke: number) => {
          const angle =
            (spoke / spokes) * Math.PI * 2 + (wobble(spoke, spec.z) - 0.5) * 0.16;
          const t = Math.pow((ring + 1) / rings, 1.3);
          const r = spec.radius * t * (0.9 + wobble(spoke * 3 + ring, spec.radius) * 0.2);
          const depth = (wobble(spoke + ring * 5, spec.spin) - 0.5) * spec.radius * 0.12;
          return [Math.cos(angle) * r, Math.sin(angle) * r, depth] as const;
        };

        const segments: number[] = [];
        const points: number[] = [];

        for (let s = 0; s < spokes; s++) {
          segments.push(0, 0, 0, ...node(0, s));
          for (let ring = 0; ring < rings - 1; ring++) {
            segments.push(...node(ring, s), ...node(ring + 1, s));
          }
        }
        for (let ring = 0; ring < rings; ring++) {
          for (let s = 0; s < spokes; s++) {
            segments.push(...node(ring, s), ...node(ring, (s + 1) % spokes));
            points.push(...node(ring, s));
          }
        }

        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(segments, 3)
        );
        const lineMat = new THREE.LineBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: spec.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        const dotGeo = new THREE.BufferGeometry();
        dotGeo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
        const dotMat = new THREE.PointsMaterial({
          color: spec.color,
          size: spec.dots,
          transparent: true,
          opacity: spec.opacity * 2.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        });

        const group = new THREE.Group();
        group.position.set(spec.x, spec.y, spec.z);
        group.add(new THREE.LineSegments(lineGeo, lineMat));
        group.add(new THREE.Points(dotGeo, dotMat));
        scene.add(group);

        groups.push({ group, spin: spec.spin });
        disposables.push(lineGeo, lineMat, dotGeo, dotMat);
      }

      // Cursor parallax, heavily damped.
      const target = { x: 0, y: 0 };
      const current = { x: 0, y: 0 };
      const onPointer = (e: PointerEvent) => {
        target.x = (e.clientX / window.innerWidth - 0.5) * 1.6;
        target.y = -(e.clientY / window.innerHeight - 0.5) * 1.1;
      };

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      let raf = 0;
      let last = performance.now();
      let running = true;

      const loop = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;

        current.x += (target.x - current.x) * 0.045;
        current.y += (target.y - current.y) * 0.045;
        camera.position.x = current.x;
        camera.position.y = current.y;
        camera.lookAt(current.x * 0.25, current.y * 0.25, -4);

        for (const { group, spin } of groups) {
          group.rotation.z += spin * dt;
        }

        renderer.render(scene, camera);
        if (running) raf = requestAnimationFrame(loop);
      };

      const onVisibility = () => {
        if (document.hidden) {
          running = false;
          cancelAnimationFrame(raf);
        } else if (!running && !reduced) {
          running = true;
          last = performance.now();
          raf = requestAnimationFrame(loop);
        }
      };

      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVisibility);

      if (reduced) {
        running = false;
        renderer.render(scene, camera);
      } else {
        window.addEventListener("pointermove", onPointer, { passive: true });
        raf = requestAnimationFrame(loop);
      }

      teardown = () => {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onPointer);
        document.removeEventListener("visibilitychange", onVisibility);
        disposables.forEach((d) => d.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      teardown();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    />
  );
}
