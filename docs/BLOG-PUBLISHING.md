# Publishing blog posts

The admin editor separates the visible article title and excerpt from the search title, search description, and opening summary. Search descriptions are limited to 160 characters as an editorial guideline, not a search-engine requirement. A blank field falls back to the archive defaults in `lib/blog-editorial.ts`, then to the article itself. The visible title and original body are preserved.

Use descriptive Markdown section headings. All headings receive stable `section-…` anchors; repeated names get numbered suffixes. Articles estimated at five minutes or more with at least three main sections receive a collapsible contents list. No manual anchor markup is needed.

Add accurate categories and tags. Related reading uses curated links for the existing archive, then shared categories and tags, and only links to published posts. Drafts are excluded. Curated relationships and metadata for the archive live in `lib/blog-editorial.ts`; admin metadata takes precedence.

For a code-backed article, register it in `lib/static-posts.ts` with its category, tags, image, publication date, actual revision date, and reading estimate. The Writing index, related reading, RSS, sitemap, and llms.txt include it once. Keep its route metadata tied to that same entry.

Publication dates stay original. Article schema, Open Graph, and sitemap use the explicit revision date, clamped to publication when old imported data is inconsistent. View counters and audio generation do not make an article appear freshly revised. A title or body save updates the explicit revision date.

Googlebot and answer crawlers can read the articles. Google-Extended is allowed for Gemini grounding; Google’s same switch also permits Gemini training. GPTBot and other listed training crawlers remain blocked. See https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers for Google’s controls.

Run `npm test`, `npm run lint`, and `npm run build` before publishing template changes. After deploying, check the article’s canonical URL, description, BlogPosting dates, RSS discovery link, section links, related reading, and mobile layout. Search Console is still needed to assess actual indexing and search performance; these checks do not guarantee rankings or AI citations.

## Other public pages

Use `pageMetadata` from `lib/page-metadata.ts` for informational pages so their canonical, Open Graph, Twitter preview, and RSS discovery agree. Homepage metadata stays in the root layout; articles have their own article metadata.

Skills, Certifications, and FAQ use the same saved content for rendering and their indexing decision. Empty collections are `noindex, follow` and omitted from the sitemap and llms.txt. Adding content in the admin restores indexing and discovery automatically. Their links have been removed from the global footer while those sections are empty; add footer links back when the sections warrant a permanent place in navigation.

Search Console and field performance data are separate from these checks. A successful deployment confirms the site is ready to crawl; it does not confirm rankings, indexing, or AI citations.
