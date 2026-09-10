"use client";
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export type SceneState = { progress: number; paused: boolean };

const fragment = `
  uniform sampler2D uDusk;
  uniform sampler2D uNight;
  uniform sampler2D uMonastery;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uProgress;
  varying vec2 vUv;

  vec2 frameUV(vec2 uv, float aspect) {
    float screenAspect = uResolution.x / uResolution.y;
    vec2 ratio = vec2(min(screenAspect / aspect, 1.), min(aspect / screenAspect, 1.));
    return (uv - .5) * ratio + .5;
  }
  vec3 photograph(sampler2D tex, float aspect, vec2 uv, float zoom) {
    vec2 cover = frameUV(uv, aspect);
    cover = (cover - .5) / zoom + .5;
    return texture2D(tex, clamp(cover, .002, .998)).rgb;
  }
  void main() {
    float p = uProgress;
    float depth = .14 + .86 * pow(1. - vUv.y, 1.8);
    vec2 uv = vUv;
    // A restrained 2.5D camera, driven by scroll and pointer; no altered source files.
    uv += uPointer * depth * .009;
    uv.x += sin(p * 1.2) * depth * .019;
    uv.y += sin(p * .9) * depth * .013;
    float zoom = 1.025 + .075 * smoothstep(0., 1.3, p);
    vec3 dusk = photograph(uDusk, 1.333333, uv, zoom);
    vec3 night = photograph(uNight, 1.777778, uv, 1.035 + .018 * p);
    vec3 monastery = photograph(uMonastery, .5625, uv, 1.02);
    float toNight = smoothstep(1.55, 2.1, p);
    float toMonastery = smoothstep(3.45, 4., p);
    vec3 color = mix(dusk, night, toNight);
    color = mix(color, monastery, toMonastery);
    float shade = mix(.98, .65, smoothstep(.55, 1., p));
    shade = mix(shade, .52, toMonastery);
    gl_FragColor = vec4(color * shade, 1.);
    #include <colorspace_fragment>
  }
`;

export default function Scene({ state, reduced }: { state: React.RefObject<SceneState>; reduced: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [smallScreen, setSmallScreen] = useState(() => typeof window !== "undefined" && matchMedia("(max-width: 760px)").matches);
  useEffect(() => {
    const media = matchMedia('(max-width: 760px)');
    const update = () => setSmallScreen(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const el = host.current;
    if (!el || reduced) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, powerPreference: 'low-power' });
    } catch { return; }
    let destroyed = false;
    let frame = 0;
    let current = state.current.progress;
    let px = 0, py = 0, tx = 0, ty = 0;
    let previousTime = 0;
    const coarse = matchMedia('(pointer: coarse)').matches;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const geometry = new THREE.PlaneGeometry(2, 2);
    const textures: THREE.Texture[] = [];
    let material: THREE.ShaderMaterial | undefined;
    const resolution = new THREE.Vector2();

    const resize = () => {
      const box = el.getBoundingClientRect();
      // Preserve Retina detail; only cap the total framebuffer for very large displays.
      const pixelBudget = 16_000_000;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2, Math.sqrt(pixelBudget / Math.max(1, box.width * box.height))));
      renderer.setSize(box.width, box.height);
      resolution.set(box.width, box.height);
      wake();
    };
    const tick = (time: number) => {
      frame = 0;
      if (destroyed || document.hidden || state.current.paused || !material) return;
      const dt = Math.min((time - previousTime) / 1000 || .016, .06);
      previousTime = time;
      const factor = 1 - Math.exp(-dt * 9);
      current += (state.current.progress - current) * factor;
      px += (tx - px) * factor;
      py += (ty - py) * factor;
      material.uniforms.uProgress.value = current;
      material.uniforms.uPointer.value.set(px, py);
      renderer.render(scene, camera);
      if (Math.abs(current - state.current.progress) + Math.abs(px - tx) + Math.abs(py - ty) > .00015) wake();
    };
    function wake() {
      if (!frame && !destroyed && !document.hidden && !state.current.paused) frame = requestAnimationFrame(tick);
    }
    const pointer = (event: PointerEvent) => {
      if (coarse || event.pointerType === 'touch') return;
      tx = event.clientX / innerWidth - .5;
      ty = .5 - event.clientY / innerHeight;
      wake();
    };
    const resetPointer = () => { tx = ty = 0; wake(); };
    const lost = (e: Event) => { e.preventDefault(); el.classList.remove('scene-ready'); cancelAnimationFrame(frame); };
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else wake(); };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    window.addEventListener('pointermove', pointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', resetPointer);
    window.addEventListener('scenechange', wake);
    document.addEventListener('visibilitychange', visibility);
    renderer.domElement.addEventListener('webglcontextlost', lost);
    const loader = new THREE.TextureLoader();
    const monasterySource = renderer.capabilities.maxTextureSize >= 5712 ? '/images/monastery-original.webp' : '/images/monastery-scene.webp';
    const sourceImages = [smallScreen ? '/images/dusk-1920.webp' : '/images/dusk-4k.webp', '/images/night-original.webp', smallScreen ? '/images/monastery-preview.webp' : monasterySource];
    Promise.all(sourceImages.map(async url => {
      const texture = await loader.loadAsync(url);
      if (destroyed) { texture.dispose(); return texture; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      textures.push(texture);
      return texture;
    })).then(([dusk, night, monastery]) => {
      if (destroyed) return;
      material = new THREE.ShaderMaterial({
        uniforms: { uDusk: { value: dusk }, uNight: { value: night }, uMonastery: { value: monastery }, uResolution: { value: resolution }, uPointer: { value: new THREE.Vector2() }, uProgress: { value: current } },
        vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
        fragmentShader: fragment,
        depthTest: false, depthWrite: false,
      });
      scene.add(new THREE.Mesh(geometry, material));
      resize();
      renderer.render(scene, camera);
      el.classList.add('scene-ready');
      wake();
    }).catch(() => { el.classList.remove('scene-ready'); });

    return () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', pointer);
      document.documentElement.removeEventListener('pointerleave', resetPointer);
      window.removeEventListener('scenechange', wake);
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      textures.forEach(t => t.dispose());
      material?.dispose(); geometry.dispose(); renderer.dispose();
      renderer.domElement.remove(); el.classList.remove('scene-ready');
    };
  }, [state, reduced, smallScreen]);
  return <div className="scene" ref={host} aria-hidden="true"><div className="scene-fallback" /></div>;
}
