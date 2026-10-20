/* Photographs that read well as characters: wide frames with one strong light
   or a clean silhouette. The home page draws one at random on each visit. */

const R2 = 'https://pub-e6b13b1038d84eb5b4a3c0cf7bf0e50a.r2.dev/photos/';
// Remote photographs come through the image optimiser so the canvas can read
// them from this origin.
const remote = (file: string) => `/_next/image?url=${encodeURIComponent(R2 + file)}&w=1920&q=75`;

export type Scene = { src: string; caption: string; label: string; focus?: [number, number]; floor?: number };

export const SCENES: Scene[] = [
  { src: '/images/night-original.webp', caption: 'Lone tent in the dark', label: 'A tent lit from inside under a sky full of stars', focus: [0.2, 0.6] },
  { src: '/images/dusk-1920.webp', caption: 'Crimson glow at dusk', label: 'The last light on a Himalayan peak', focus: [0.55, 0.55] },
  { src: remote('1cf77393-4aa3-408e-b8c8-625bd49c4750.jpg'), caption: 'Midnight blue and sodium amber', label: 'The Golden Gate Bridge lit at night', focus: [0.4, 0.5] },
  { src: remote('2325f038-a22a-45d0-97d1-16f9979f27de.jpg'), caption: 'Warm light, endless ridgelines', label: 'Two snow peaks catching the evening light above dark ridges', focus: [0.5, 0.4] },
];

/** Picks the scene for one visit; the home page renders per request. */
export const randomScene = () => Math.floor(Math.random() * SCENES.length);
