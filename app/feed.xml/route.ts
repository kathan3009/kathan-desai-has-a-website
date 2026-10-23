import { blogPresentation } from "@/lib/blog-presentation";
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { STATIC_POSTS } from "@/lib/static-posts";

export const dynamic = "force-dynamic";

const escape = (value: string) => value.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string);

type Item = { title: string; url: string; date: Date; description: string; category?: string };

export async function GET() {
  const items: Item[] = STATIC_POSTS.map((post) => ({ title: post.title, url: `${SITE_URL}/blogs/${post.slug}`, date: new Date(post.publishedAt), description: blogPresentation(post).description }));
  try {
    const conn = await dbConnect();
    if (conn) {
      const staticSlugs = new Set(STATIC_POSTS.map((post) => post.slug));
      const posts = await Blog.find({ isDraft: { $ne: true } }).select("title slug excerpt content seoDescription publishedAt category").sort({ publishedAt: -1 }).limit(50).lean();
      for (const post of posts) {
        if (staticSlugs.has(String(post.slug))) continue;
        items.push({ title: String(post.title), url: `${SITE_URL}/blogs/${encodeURIComponent(String(post.slug))}`, date: new Date(post.publishedAt), description: blogPresentation({ slug: String(post.slug), title: String(post.title), excerpt: String(post.excerpt || ""), content: String(post.content || ""), seoDescription: String(post.seoDescription || "") }).description, category: post.category ? String(post.category) : undefined });
      }
    }
  } catch {
    // The static posts still make a valid feed.
  }
  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${escape(SITE_NAME)}: writing</title>
<link>${SITE_URL}/blogs</link>
<atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
<description>${escape(SITE_DESCRIPTION)}</description>
<language>en</language>
<lastBuildDate>${(items[0]?.date ?? new Date()).toUTCString()}</lastBuildDate>
${items.map((item) => `<item>
<title>${escape(item.title)}</title>
<link>${item.url}</link>
<guid isPermaLink="true">${item.url}</guid>
<pubDate>${item.date.toUTCString()}</pubDate>
<dc:creator>${escape(AUTHOR.name)}</dc:creator>
${item.category ? `<category>${escape(item.category)}</category>\n` : ""}<description>${escape(item.description)}</description>
</item>`).join("\n")}
</channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
