import { MetadataRoute } from "next";
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kathandesai.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/faq",
    "/work",
    "/projects",
    "/skills",
    "/blogs",
    "/certifications",
    "/photography",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: (path === "" ? "weekly" : "monthly") as "weekly" | "monthly",
    priority: path === "" ? 1 : 0.8,
  }));

  let blogUrls: MetadataRoute.Sitemap = [];
  try {
    const conn = await dbConnect();
    if (conn) {
      const posts = await Blog.find().select("slug updatedAt");
      blogUrls = posts.map((p) => ({
        url: `${baseUrl}/blogs/${p.slug}`,
        lastModified: new Date(p.updatedAt || p),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // DB might not be configured yet
  }

  const allUrls = [...staticPages, ...blogUrls];
  return allUrls.filter((entry) => !entry.url.includes("/admin"));
}
