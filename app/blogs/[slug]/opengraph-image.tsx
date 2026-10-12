import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { postDate } from "@/components/reading/post-utils";

export const alt = "Essay by Kathan Desai";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const conn = await dbConnect();
  const post = conn ? await Blog.findOne({ slug, isDraft: { $ne: true } }).select("title featuredImage publishedAt category").lean() : null;
  if (!post) return ogCard({ title: "Writing by Kathan Desai", kicker: "Build notes and essays" });
  const date = postDate(post.publishedAt)?.label;
  const image = typeof post.featuredImage === "string" && /^https?:\/\//.test(post.featuredImage) ? post.featuredImage : undefined;
  return ogCard({ title: String(post.title), kicker: [post.category, date].filter(Boolean).join(" · ") || undefined, image });
}
