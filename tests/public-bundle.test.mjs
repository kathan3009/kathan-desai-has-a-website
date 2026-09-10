import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

/** Everything the root layout pulls in ships to every visitor. */
function reachableFromRootLayout() {
  const seen = new Set();
  const queue = [join(ROOT, 'app/layout.tsx')];
  while (queue.length) {
    const file = queue.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      const spec = match[1];
      const base = spec.startsWith('@/') ? join(ROOT, spec.slice(2)) : spec.startsWith('.') ? join(dirname(file), spec) : null;
      if (!base) continue;
      const candidate = ['.ts', '.tsx', '/index.ts', '/index.tsx', ''].map(ext => `${base}${ext}`).find(p => existsSync(p) && !p.endsWith('.css'));
      if (candidate) queue.push(candidate);
    }
  }
  return [...seen];
}

test('the admin path never reaches code that every visitor downloads', () => {
  // The deployment's admin path is a secret. A client module in the root layout
  // has its NEXT_PUBLIC_* reads inlined into the public bundle, so no module
  // reachable from the root layout may read it. The admin layout locks gesture
  // controls out instead, without naming the path.
  const offenders = reachableFromRootLayout().filter(file => readFileSync(file, 'utf8').includes('process.env.NEXT_PUBLIC_ADMIN_PATH'));
  assert.deepEqual(
    offenders.map(file => file.replace(`${ROOT}/`, '')),
    [],
    'these ship to every visitor and would expose the admin path',
  );
});

test('the gesture feature reads no build-time environment at all', () => {
  const files = reachableFromRootLayout().filter(file => /components\/(gestures|paint)\/|lib\/gestures\//.test(file));
  assert.ok(files.length > 3, 'the walk should have found the gesture modules');
  for (const file of files) {
    const inlined = readFileSync(file, 'utf8').match(/process\.env\.NEXT_PUBLIC_[A-Z0-9_]+/g);
    assert.equal(inlined, null, `${file.replace(`${ROOT}/`, '')} inlines ${inlined?.join(', ')} into the public bundle`);
  }
});
