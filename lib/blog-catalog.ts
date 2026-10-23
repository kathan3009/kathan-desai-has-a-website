import { cache } from "react";
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import { STATIC_POSTS } from "./static-posts";
import { BLOG_EDITORIAL } from "./blog-editorial";

export type BlogLink = { slug: string; title: string; category: string; tags: string[] };
// Only published entries enter the link graph. A static route wins over a DB
// record with the same slug, just as it does in the App Router.
export function mergeStaticPosts<T extends BlogLink>(posts: T[], staticPosts: T[]): T[] {
  const staticSlugs = new Set(staticPosts.map(post => post.slug));
  return [...posts.filter(post => !staticSlugs.has(post.slug)), ...staticPosts];
}
export const blogCatalog = cache(async (): Promise<BlogLink[]> => {
  const conn = await dbConnect();
  const posts = conn ? await Blog.find({ isDraft: { $ne: true } }).select("slug title category tags").lean() : [];
  return mergeStaticPosts(posts.map(post => ({ slug: String(post.slug), title: String(post.title), category: String(post.category || ""), tags: (post.tags || []).map(String) })), STATIC_POSTS.map(post => ({ slug: post.slug, title: post.title, category: post.category, tags: post.tags })));
});
export function relatedPosts(slug: string, posts: BlogLink[]): BlogLink[] {
  const current = posts.find(post => post.slug === slug);
  const preferred = BLOG_EDITORIAL[slug]?.related || [];
  return posts.filter(post => post.slug !== slug).map(post => {
    const index = preferred.indexOf(post.slug);
    const score = index >= 0 ? 100 - index : current ? (post.category && post.category === current.category ? 3 : 0) + post.tags.filter(tag => current.tags.includes(tag)).length : 0;
    return { post, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.post.slug.localeCompare(b.post.slug)).slice(0, 3).map(item => item.post);
}
