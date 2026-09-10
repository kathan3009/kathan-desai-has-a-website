import type {BrushId} from './artboard';

/** Same-origin assets. The MediaPipe loader resolves `vendor/wasm` and `models/` under this. */
export const GESTURE_ASSET_BASE = '/gestures/';

export const PREFERENCE_KEY = 'kathan-hand-controls';

export type ScrollSpeed = 'gentle' | 'steady' | 'quick';

export type GesturePreferences = {
  /** Which hand drives the pointer. */
  hand: 'Right' | 'Left';
  /** Flip the scroll direction for people who read the pose the other way. */
  reverse: boolean;
  scrollSpeed: ScrollSpeed;
  /** Export the artwork without paper behind it. */
  transparent: boolean;
};

export const DEFAULT_PREFERENCES: GesturePreferences = {
  hand: 'Right',
  reverse: false,
  scrollSpeed: 'steady',
  transparent: false,
};

export const SCROLL_SPEEDS: Record<ScrollSpeed, number> = {gentle: 0.45, steady: 0.7, quick: 1};

/** Preferences only. Video, frames, landmarks, and the on/off state are never stored. */
export function readPreferences(): GesturePreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCE_KEY) || '{}');
    return {
      hand: saved.hand === 'Left' ? 'Left' : 'Right',
      reverse: saved.reverse === true,
      scrollSpeed: (['gentle', 'steady', 'quick'] as const).includes(saved.scrollSpeed) ? saved.scrollSpeed : 'steady',
      transparent: saved.transparent === true,
    };
  } catch {
    return {...DEFAULT_PREFERENCES};
  }
}

export function writePreferences(preferences: GesturePreferences) {
  try {
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
  } catch {
    /* Private mode — preferences last for this session only. */
  }
}

/** Named so a choice can be spoken, read aloud, and dwelt on with confidence. */
export const PAINT_COLORS: {name: string; hex: string}[] = [
  {name: 'Pine', hex: '#2f5d47'},
  {name: 'Copper', hex: '#b87333'},
  {name: 'Red', hex: '#c2352c'},
  {name: 'Dusk', hex: '#3a4c6b'},
  {name: 'Rose', hex: '#c2607a'},
  {name: 'Gold', hex: '#d4a437'},
  {name: 'Ink', hex: '#242b29'},
  {name: 'Chalk', hex: '#ffffff'},
];

export const PAINT_BRUSHES: {id: BrushId; label: string; note: string}[] = [
  {id: 'pen', label: 'Pen', note: 'A steady line'},
  {id: 'marker', label: 'Marker', note: 'Wide and see-through'},
  {id: 'neon', label: 'Neon', note: 'Glows at the edges'},
  {id: 'web', label: 'Web', note: 'Threads back on itself'},
  {id: 'spray', label: 'Spray', note: 'Scattered dots'},
];

export const INK_SIZES = [4, 12, 32];
export const ERASER_SIZES = [24, 64, 120];

export const PAPERS = [
  {id: 'white', label: 'White paper', hex: '#ffffff'},
  {id: 'night', label: 'Night paper', hex: '#1b211f'},
] as const;
