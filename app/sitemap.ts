import type { MetadataRoute } from "next";
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import Project from "@/models/Project";
import Photo from "@/models/Photo";
import { SITE_URL } from "@/lib/site";
import { STATIC_POSTS } from "@/lib/static-posts";

export const dynamic = "force-dynamic";

// Static pages carry no lastModified: a date that is always "now" tells
// crawlers nothing, and they learn to ignore it for the pages that matter.
const staticPages: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}`, changeFrequency: "weekly", priority: 1 },
  { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${SITE_URL}/projects`, changeFrequency: "monthly", priority: 0.9 },
  { url: `${SITE_URL}/blogs`, changeFrequency: "weekly", priority: 0.9 },
  { url: `${SITE_URL}/photography`, changeFrequency: "monthly", priority: 0.7 },
  { url: `${SITE_URL}/photoshop-mcp`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${SITE_URL}/now`, changeFrequency: "monthly", priority: 0.6 },
  { url: `${SITE_URL}/work`, changeFrequency: "monthly", priority: 0.6 },
  { url: `${SITE_URL}/skills`, changeFrequency: "yearly", priority: 0.4 },
  { url: `${SITE_URL}/certifications`, changeFrequency: "yearly", priority: 0.4 },
  { url: `${SITE_URL}/faq`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${SITE_URL}/paint`, changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [...staticPages];
  entries.push(...STATIC_POSTS.map((post) => ({ url: `${SITE_URL}/blogs/${post.slug}`, lastModified: new Date(post.publishedAt), changeFrequency: "monthly" as const, priority: 0.7, images: post.image ? [`${SITE_URL}${post.image}`] : undefined })));
  try {
    const conn = await dbConnect();
    if (conn) {
      const [posts, projects, photos] = await Promise.all([
        Blog.find({ isDraft: { $ne: true } }).select("slug publishedAt dateModified updatedAt featuredImage").lean(),
        Project.find().select("updatedAt image").lean(),
        Photo.find().sort({ order: 1 }).select("image").lean(),
      ]);
      const staticSlugs = new Set(STATIC_POSTS.map((post) => post.slug));
      entries.push(...posts.filter((post) => !staticSlugs.has(String(post.slug))).map((post) => ({
        url: `${SITE_URL}/blogs/${encodeURIComponent(String(post.slug))}`,
        lastModified: new Date(post.dateModified || post.updatedAt || post.publishedAt),
        changeFrequency: "monthly" as const,
        priority: 0.7,
        images: typeof post.featuredImage === "string" && post.featuredImage.startsWith("http") ? [post.featuredImage] : undefined,
      })));
      entries.push(...projects.map((project) => ({
        url: `${SITE_URL}/projects/${project._id}`,
        lastModified: new Date(project.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.7,
        images: typeof project.image === "string" && project.image.startsWith("http") ? [project.image] : undefined,
      })));
      const gallery = entries.find((entry) => entry.url === `${SITE_URL}/photography`);
      if (gallery && photos.length) gallery.images = photos.map((photo) => String(photo.image)).filter((image) => image.startsWith("http"));
    }
  } catch {
    // Without a database the static pages still ship.
  }
  return entries;
}
