import { BLOG_EDITORIAL } from "./blog-editorial";
import { plainText } from "./seo";

type EditorialPost = { slug: string; title: string; content?: string; excerpt?: string; seoTitle?: string; seoDescription?: string; summary?: string };
export function blogPresentation(post: EditorialPost) {
  const defaults = BLOG_EDITORIAL[post.slug];
  return {
    title: post.seoTitle?.trim() || defaults?.title || post.title,
    description: plainText(post.seoDescription?.trim() || defaults?.description || post.excerpt || post.content || post.title, 160),
    summary: post.summary?.trim() || defaults?.summary || post.excerpt || "",
  };
}

// A migrated timestamp may predate publication. Never advertise that as a
// revision, or use updatedAt (which can change when views/audio are saved).
export function blogModifiedDate(post: { publishedAt: Date | string; dateModified?: Date | string | null }): Date {
  const published = new Date(post.publishedAt);
  const modified = post.dateModified ? new Date(post.dateModified) : published;
  return Number.isFinite(modified.getTime()) && modified > published ? modified : published;
}
