"use client";
/* One of the photographs, drawn in characters, with its caption and a way to
   draw a different one without reloading. */

import { useState } from 'react';
import AsciiScene from '../ascii/AsciiScene';
import { SCENES } from '@/lib/scenes';

export default function HeroScene({ initial }: { initial: number }) {
  const [index, setIndex] = useState(initial);
  const scene = SCENES[index] ?? SCENES[0];
  const another = () => setIndex(current => (current + 1 + Math.floor(Math.random() * (SCENES.length - 1))) % SCENES.length);

  return <figure className="hero-scene">
    <div className="hero-canvas">
      <AsciiScene src={scene.src} label={`${scene.label}, drawn in text characters`} focus={scene.focus} floor={scene.floor} />
    </div>
    <figcaption>
      <span>{scene.caption}</span>
      <button type="button" onClick={another}>Draw another</button>
    </figcaption>
  </figure>;
}
