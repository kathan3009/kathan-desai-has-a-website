// Static build note for Photoshop MCP. Lives beside the database-backed posts (a static segment wins over
// the dynamic [slug] route); STATIC_POSTS also lists it on /blogs, in the feed, and in the sitemap.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";
import { ArticleSchema } from "@/components/schema/Article";
import { ReaderShell } from "@/components/reading/ReaderShell";
import { postDate, readingMinutes } from "@/components/reading/post-utils";
import styles from "@/components/reading/reading.module.css";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { STATIC_POSTS } from "@/lib/static-posts";
import { blogPresentation } from "@/lib/blog-presentation";
import { ArticleContents } from "@/components/reading/ArticleContents";
import { RelatedReading } from "@/components/reading/RelatedReading";
import { SITE_URL, FEED_ALTERNATE } from "@/lib/site";

export const dynamic = "force-dynamic";

const POST = STATIC_POSTS[0];
const { slug: SLUG, title: TITLE, excerpt: EXCERPT, publishedAt: PUBLISHED, dateModified: MODIFIED, image: IMAGE } = POST;
const search = blogPresentation(POST);
export const metadata: Metadata = {
  title: { absolute: `${search.title} | Kathan Desai` },
  description: search.description,
  authors: [{ name: "Kathan Desai", url: "/about" }],
  alternates: { canonical: `/blogs/${SLUG}`, types: FEED_ALTERNATE },
  openGraph: { type: "article", title: search.title, description: search.description, url: `/blogs/${SLUG}`, publishedTime: PUBLISHED, modifiedTime: MODIFIED, images: [IMAGE] },
  twitter: { card: "summary_large_image", title: search.title, description: search.description, images: [IMAGE] },
};

const content = () => readFile(join(process.cwd(), "content", `${SLUG}.md`), "utf8");

export default async function PhotoshopMcpPost() {
  const md = await content();
  const published = postDate(PUBLISHED)!;
  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Writing", url: "/blogs" }, { name: TITLE, url: `/blogs/${SLUG}` }]} />
      <ArticleSchema headline={TITLE} description={search.description} datePublished={published.iso} dateModified={MODIFIED} image={IMAGE} url={`${SITE_URL}/blogs/${SLUG}`} authorName="Kathan Desai" authorUrl={`${SITE_URL}/about`} />
      <ReaderShell>
        <article id="reading-article" tabIndex={-1} className={styles.article} aria-labelledby="article-title">
          <header className={styles.articleHeader}>
            <Link className={styles.articleCategory} href="/blogs?category=Build%20notes">Build notes</Link>
            <h1 id="article-title">{TITLE}</h1>
            <div className={styles.byline}>
              <Link href="/about">Kathan Desai</Link>
              <time dateTime={published.iso}>{published.label}</time>
              <span>Updated <time dateTime={MODIFIED}>{postDate(MODIFIED)!.label}</time></span>
              <span>{readingMinutes(md)} min read</span>
            </div>
            <p className={styles.lede}>{EXCERPT}</p>
          </header>
          <div className={styles.heroMedia}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/photoshop-mcp/app-overview.jpg" alt="The Photoshop MCP app's overview tab" style={{ width: "100%", borderRadius: 12, display: "block" }} />
          </div>
          <ArticleContents content={md} />
          <MarkdownRenderer content={md} />
          <RelatedReading slug={SLUG} />
        </article>
      </ReaderShell>
    </>
  );
}
