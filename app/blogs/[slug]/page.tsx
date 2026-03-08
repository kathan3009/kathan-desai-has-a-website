import { notFound } from "next/navigation";
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";
import { ArticleSchema } from "@/components/schema/Article";
import { MediaBlock } from "@/components/MediaBlock";
import { BlogViewTracker } from "@/components/BlogViewTracker";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const conn = await dbConnect();
  const post = conn ? await Blog.findOne({ slug }) : null;
  if (!post) return { title: "Not Found" };
  return {
    title: post.title,
    description: post.excerpt || post.content.slice(0, 160),
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const conn = await dbConnect();
  const post = conn ? await Blog.findOne({ slug }) : null;
  if (!post) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kathandesai.com";
  const url = `${baseUrl}/blogs/${post.slug}`;

  return (
    <>
      <BlogViewTracker slug={post.slug} />
      <BreadcrumbListSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Blogs", url: "/blogs" },
          { name: post.title, url: `/blogs/${post.slug}` },
        ]}
      />
      <ArticleSchema
        headline={post.title}
        description={post.excerpt || post.content.slice(0, 160)}
        datePublished={new Date(post.publishedAt).toISOString()}
        dateModified={new Date(post.dateModified || post.updatedAt).toISOString()}
        image={post.featuredImage}
        url={url}
      />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{post.title}</h1>
        {(post.featuredImage || post.videoEmbed || (post.content && (post.content.includes("youtube") || post.content.includes("youtu.be")))) && (
          <div className="mb-6">
            <MediaBlock
              image={post.featuredImage}
              videoEmbed={post.videoEmbed}
              content={post.content}
              alt={post.title}
              variant="blog-hero"
              prioritizeVideo
            />
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 mb-8">
          <p className="text-muted text-sm min-w-0 shrink-0">
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {post.category && ` · ${post.category}`}
            {post.author?.name && ` · ${post.author.name}`}
          </p>
          <div className="flex items-center gap-3 shrink-0">
            <a href="https://x.com/kathandesai3009" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-accent transition-colors" aria-label="X (Twitter)">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/kathandesai1/" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-accent transition-colors" aria-label="LinkedIn">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
        <div
          className="prose max-w-none prose-p:text-muted prose-headings:text-foreground prose-a:text-accent"
          dangerouslySetInnerHTML={{ __html: simpleMarkdown(post.content) }}
        />
      </article>
    </>
  );
}

function simpleMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/^### (.*)$/gim, "<h3 class='text-lg font-semibold text-foreground mt-6 mb-2'>$1</h3>")
    .replace(/^## (.*)$/gim, "<h2 class='text-xl font-semibold text-foreground mt-8 mb-3'>$1</h2>")
    .replace(/^# (.*)$/gim, "<h1 class='text-2xl font-bold text-foreground mt-8 mb-3'>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code class='bg-card border border-border px-1 rounded text-accent'>$1</code>")
    .replace(/\[(.*?)\]\((.*?)\)/g, (_, text, href) => {
      const trimmed = (href || "").trim();
      if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return `[${text}](${href})`;
      return `<a href="${trimmed.replace(/"/g, "&quot;")}" class="text-accent hover:underline" target="_blank" rel="noopener noreferrer">${text}</a>`;
    })
    .split(/\n\n+/)
    .map((p) => {
      const t = p.trim();
      if (!t) return "";
      if (t.startsWith("<h")) return t;
      return `<p class="text-muted leading-relaxed mt-4">${t.replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
}
