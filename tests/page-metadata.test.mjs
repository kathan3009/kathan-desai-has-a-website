import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '..');
function fixture(records = {}, connected = true) {
  const loaded = new Map();
  function load(name) {
    const filename = resolve(root, name);
    if (loaded.has(filename)) return loaded.get(filename).exports;
    const mod = { exports: {} }; loaded.set(filename, mod);
    const source = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(source, { module: mod, exports: mod.exports, process: { env: {} }, require(spec) {
      if (spec === '@/lib/db') return { __esModule: true, default: async () => connected };
      if (spec.startsWith('@/models/')) {
        const values = records[spec.split('/').pop()] || [];
        return { __esModule: true, default: { exists: async () => values.length ? { _id: 'fixture' } : null, find: () => ({ sort: async () => values }) } };
      }
      if (spec.startsWith('@/components/')) return {};
      if (spec === 'react') return { cache: fn => fn };
      if (spec.startsWith('@/') || spec.startsWith('.')) {
        const base = spec.startsWith('@/') ? resolve(root, spec.slice(2)) : resolve(dirname(filename), spec);
        return load(existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
      }
      return require(spec);
    } }, { filename });
    return mod.exports;
  }
  return load;
}

test('page metadata owns its canonical, social preview, RSS, and crawler directives', () => {
  const { pageMetadata } = fixture()('lib/page-metadata.ts');
  const metadata = pageMetadata({ title: 'About', description: 'About Kathan.', path: '/about' });
  assert.equal(metadata.alternates.canonical, '/about');
  assert.ok(metadata.alternates.types['application/rss+xml']);
  assert.equal(metadata.openGraph.url, '/about');
  assert.equal(metadata.openGraph.title, 'About');
  assert.equal(metadata.twitter.description, 'About Kathan.');
  assert.equal(metadata.title.absolute, 'About | Kathan Desai');
  assert.equal(metadata.robots.index, true);
});

test('empty pages stay out of search and discovery, populated pages return automatically', async () => {
  for (const populated of [false, true]) {
    const load = fixture(populated ? { Skill: [{ name: 'TypeScript' }], Certification: [{ name: 'Credential' }], FAQ: [{ question: 'Question', answer: 'Answer' }] } : {});
    const { publishedOptionalPages } = load('lib/optional-pages.ts');
    assert.equal((await publishedOptionalPages()).length, populated ? 3 : 0);
    for (const route of ['skills', 'certifications', 'faq']) {
      const { generateMetadata } = load(`app/${route}/page.tsx`);
      const metadata = await generateMetadata();
      assert.equal(metadata.robots.index, populated);
      assert.equal(metadata.robots.googleBot.index, populated);
      assert.equal(metadata.robots.follow, true);
      assert.equal(metadata.alternates.canonical, `/${route}`);
      assert.equal(metadata.openGraph.url, `/${route}`);
    }
  }
});

test('only collections with content enter discovery and database unavailability fails closed', async () => {
  const partial = fixture({ FAQ: [{ question: 'Question', answer: 'Answer' }] })('lib/optional-pages.ts');
  assert.equal((await partial.publishedOptionalPages()).map(page => page.path).join(','), '/faq');
  const unavailable = fixture({ Skill: [{ name: 'TypeScript' }] }, false)('lib/optional-pages.ts');
  assert.equal((await unavailable.publishedOptionalPages()).length, 0);
});
