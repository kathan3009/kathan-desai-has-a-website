/**
 * Rebuilds the same-origin hand-tracking assets under `public/gestures/`.
 *
 * The files are committed, so a deploy never depends on the network. Run this
 * only when the MediaPipe runtime version changes:
 *
 *   npm install --no-save @mediapipe/tasks-vision@<version> esbuild
 *   node scripts/setup-gesture-assets.mjs
 *
 * The worker stays a CLASSIC worker on purpose: the MediaPipe WASM loader uses
 * importScripts, which an ES module worker cannot do.
 */
import {mkdir, cp, access, writeFile} from 'node:fs/promises';
import {build} from 'esbuild';

const OUT = 'public/gestures';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const WORKER = `import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
let model;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const files = await FilesetResolver.forVisionTasks(\`\${data.base}vendor/wasm\`);
      model = await HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: \`\${data.base}models/hand_landmarker.task\`, delegate: 'CPU' },
        runningMode: 'VIDEO', numHands: 2,
        minHandDetectionConfidence: .65, minHandPresenceConfidence: .65, minTrackingConfidence: .65,
      });
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'frame') {
      try {
        if (!model) throw new Error('Hand model is not ready.');
        const result = model.detectForVideo(data.bitmap, data.timestamp);
        self.postMessage({ type: 'result', result: { landmarks: result.landmarks, handedness: result.handedness, aspect: data.bitmap.width / data.bitmap.height } });
      } finally { data.bitmap.close(); }
    }
  } catch (error) { self.postMessage({ type: 'error', message: \`Hand tracking: \${error.message}\` }); }
};
`;

await mkdir(`${OUT}/vendor`, {recursive: true});
await mkdir(`${OUT}/models`, {recursive: true});
await cp('node_modules/@mediapipe/tasks-vision/wasm', `${OUT}/vendor/wasm`, {recursive: true});
await writeFile('.gesture-worker.tmp.js', WORKER);
await build({
  entryPoints: ['.gesture-worker.tmp.js'],
  outfile: `${OUT}/tracking-worker.js`,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  minify: true,
  legalComments: 'eof',
});

try {
  await access(`${OUT}/models/hand_landmarker.task`);
} catch {
  const response = await fetch(MODEL);
  if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
  await writeFile(`${OUT}/models/hand_landmarker.task`, Buffer.from(await response.arrayBuffer()));
}

console.log(`Model, WASM runtime, and classic tracking worker ready in ${OUT}.`);
