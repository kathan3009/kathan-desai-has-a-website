import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '..');
const modules = new Map();
function load(name) {
  const filename = resolve(root, name);
  if (modules.has(filename)) return modules.get(filename).exports;
  const loaded = { exports: {} }; modules.set(filename, loaded);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, Date, process: { env: {} }, require(spec) {
    if (spec === '@/lib/db') return { default: async () => null, __esModule: true };
    if (spec === '@/models/Blog') return { default: {}, __esModule: true };
    if (spec === 'react') return { cache: fn => fn };
    if (spec.startsWith('@/')) return load(spec.slice(2) + '.ts');
    if (spec.startsWith('.')) return load(resolve(dirname(filename), spec + '.ts'));
    return require(spec);
  } }, { filename });
  return loaded.exports;
}
const { blogPresentation, blogModifiedDate } = load('lib/blog-presentation.ts');
const { articleHeadings } = load('lib/article-headings.ts');
const { BLOG_EDITORIAL } = load('lib/blog-editorial.ts');
const { mergeStaticPosts, relatedPosts } = load('lib/blog-catalog.ts');

test('existing articles have unique concise descriptions and admin overrides win', () => {
  const descriptions = new Set();
  for (const [slug, entry] of Object.entries(BLOG_EDITORIAL)) {
    assert.ok(entry.description.length <= 160, slug);
    assert.ok(!descriptions.has(entry.description)); descriptions.add(entry.description);
    const result = blogPresentation({ slug, title: 'Visible title', excerpt: 'Original opening paragraph' });
    assert.equal(result.description, entry.description);
    assert.equal(result.title, entry.title);
    const edited = blogPresentation({ slug, title: 'Visible title', seoTitle: 'Custom title', seoDescription: 'Custom description', summary: 'Custom summary' });
    assert.equal(edited.title, 'Custom title'); assert.equal(edited.description, 'Custom description'); assert.equal(edited.summary, 'Custom summary');
  }
  const fallback = blogPresentation({ slug: 'new-post', title: 'New', excerpt: 'A long excerpt. '.repeat(30) });
  assert.ok(fallback.description.length <= 160);
  assert.equal(fallback.summary, 'A long excerpt. '.repeat(30));
});

test('revision dates cannot predate publication or change with a view counter', () => {
  const publishedAt = '2026-08-10T15:24:00.000Z';
  for (const dateModified of [undefined, 'invalid', '2026-08-10T12:30:00.000Z']) {
    assert.equal(blogModifiedDate({ publishedAt, dateModified, updatedAt: '2026-10-23T00:00:00.000Z' }).toISOString(), publishedAt);
  }
  assert.equal(blogModifiedDate({ publishedAt, dateModified: '2026-10-23T00:00:00.000Z' }).toISOString(), '2026-10-23T00:00:00.000Z');
});

test('section anchors handle Markdown, duplicate names, Unicode and fenced code', () => {
  const headings = articleHeadings('# Start\n## **Data** and `models`\n## Data and models\n## Data and models-2\n## Café 模型\n```md\n## Not a heading\n```\nSetext\n------\n');
  assert.equal(headings.length, 6);
  assert.equal(new Set(headings.map(h => h.id)).size, headings.length);
  assert.equal(headings[1].id, 'section-data-and-models');
  assert.equal(headings[2].id, 'section-data-and-models-2');
  assert.equal(headings[3].id, 'section-data-and-models-2-2');
  assert.equal(headings[4].id, 'section-café-模型');
  assert.equal(headings[5].text, 'Setext');
});

test('static posts appear once and related links only point to the supplied published catalog', () => {
  const staticPost = { slug: 'photoshop-mcp-let-your-agent-work-in-photoshop', title: 'Static', category: '', tags: [] };
  const merged = mergeStaticPosts([{ ...staticPost, title: 'DB duplicate' }], [staticPost]);
  assert.equal(merged.length, 1); assert.equal(merged[0].title, 'Static');
  const known = Object.keys(BLOG_EDITORIAL);
  const catalog = known.map(slug => ({ slug, title: slug, category: '', tags: [] }));
  for (const slug of known) {
    const links = relatedPosts(slug, catalog);
    assert.ok(links.length > 0, slug);
    assert.ok(links.every(post => post.slug !== slug && known.includes(post.slug)));
    const removed = links[0].slug;
    assert.ok(relatedPosts(slug, catalog.filter(post => post.slug !== removed)).every(post => post.slug !== removed));
  }
});

test('Gemini grounding and answer crawlers can fetch articles, GPTBot stays blocked', () => {
  const { default: robots } = load('app/robots.ts');
  const rules = robots().rules;
  for (const agent of ['Google-Extended', 'OAI-SearchBot', 'PerplexityBot']) {
    const rule = rules.find(rule => rule.userAgent === agent);
    assert.equal(rule.allow, '/'); assert.ok(rule.disallow.includes('/api/'));
  }
  assert.equal(rules.find(rule => rule.userAgent === 'GPTBot').disallow, '/');
});
