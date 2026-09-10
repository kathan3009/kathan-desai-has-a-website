import { notFound } from "next/navigation";
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";
import { ArticleSchema } from "@/components/schema/Article";
import { MediaBlock } from "@/components/MediaBlock";
import { BlogViewTracker } from "@/components/BlogViewTracker";
import Link from "next/link";
import { cache } from "react";
import { ReaderShell } from "@/components/reading/ReaderShell";
import { postDate, readingMinutes } from "@/components/reading/post-utils";
import styles from "@/components/reading/reading.module.css";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const getPost = cache(async (slug: string) => {
  const conn = await dbConnect();
  return conn ? Blog.findOne({ slug, isDraft: { $ne: true } }) : null;
});

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Not Found" };
  const description = post.excerpt || post.content.slice(0, 160);
  const image = post.featuredImage ? [post.featuredImage] : [];
  return {
    title: post.title,
    description,
    authors: [{ name: post.author?.name || "Kathan Desai", url: post.author?.url || "/about" }],
    alternates: { canonical: `/blogs/${encodeURIComponent(post.slug)}` },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: `/blogs/${encodeURIComponent(post.slug)}`,
      publishedTime: postDate(post.publishedAt)?.iso,
      modifiedTime: postDate(post.dateModified || post.updatedAt || post.publishedAt)?.iso,
      images: image,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: post.title,
      description,
      images: image,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kathandesai.com";
  const url = `${baseUrl}/blogs/${encodeURIComponent(post.slug)}`;

  const published = postDate(post.publishedAt);
  const modified = postDate(post.dateModified || post.updatedAt || post.publishedAt);

  return (
    <>
      <BlogViewTracker key={post.slug} slug={post.slug} />
      <BreadcrumbListSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Writing", url: "/blogs" },
          { name: post.title, url: `/blogs/${encodeURIComponent(post.slug)}` },
        ]}
      />
      <ArticleSchema
        headline={post.title}
        description={post.excerpt || post.content.slice(0, 160)}
        datePublished={published?.iso ?? ""}
        dateModified={modified?.iso ?? ""}
        image={post.featuredImage}
        url={url}
        authorName={post.author?.name}
        authorUrl={post.author?.url}
      />
      <ReaderShell>
        <article id="reading-article" tabIndex={-1} className={styles.article} aria-labelledby="article-title">
          <header className={styles.articleHeader}>
            {post.category && <Link className={styles.articleCategory} href={`/blogs?category=${encodeURIComponent(post.category)}`}>{post.category}</Link>}
            <h1 id="article-title">{post.title}</h1>
            <div className={styles.byline}>
              {post.author?.name && <span>{post.author.name}</span>}
              {published && <time dateTime={published.iso}>{published.label}</time>}
              <span>{readingMinutes(post.content)} min read</span>
            </div>
            {post.excerpt && <p className={styles.lede}>{post.excerpt}</p>}
          </header>
          {(post.featuredImage || post.videoEmbed || (post.content && (post.content.includes("youtube") || post.content.includes("youtu.be")))) && (
            <div className={styles.heroMedia}>
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
          {post.audioUrl && (
            <section className={styles.audio} aria-labelledby="article-audio-label">
              <h2 id="article-audio-label">Listen to this article</h2>
              <audio
                aria-label="Listen to this article"
                controls
                preload="metadata"
                className="w-full h-10"
                src={post.audioUrl}
              >
                <a href={post.audioUrl} download>Download audio</a>
              </audio>
              <a href={post.audioUrl} download>Download audio</a>
            </section>
          )}
          <MarkdownRenderer content={post.content} />
          <footer className={styles.articleFooter}>
            <Link href="/blogs">Back to all writing</Link>
            <div className="flex items-center gap-3 shrink-0">
              <a href="https://x.com/heykathan" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="X">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/in/kathandesai1/" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="LinkedIn">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </footer>
        </article>
      </ReaderShell>
    </>
  );
}
