// Static build note for Photoshop MCP. Lives beside the database-backed posts (a static segment wins over
// the dynamic [slug] route) so it ships with the code; paste content/*.md into the admin panel to list it on /blogs.
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
import { SITE_URL } from "@/lib/site";

const SLUG = "photoshop-mcp-let-your-agent-work-in-photoshop";
const TITLE = "Photoshop MCP: let your agent work in Photoshop";
const EXCERPT = "A weekend of letting Claude grade raw photos turned into a Mac app that connects any MCP client to Photoshop — and a list of things Photoshop quietly lies about.";
const PUBLISHED = "2026-10-11T12:00:00.000Z";
const IMAGE = "/images/photoshop-mcp/og.jpg";

export const metadata: Metadata = {
  title: TITLE,
  description: EXCERPT,
  alternates: { canonical: `/blogs/${SLUG}` },
  openGraph: { type: "article", title: TITLE, description: EXCERPT, url: `/blogs/${SLUG}`, publishedTime: PUBLISHED, images: [IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: EXCERPT, images: [IMAGE] },
};

const content = () => readFile(join(process.cwd(), "content", `${SLUG}.md`), "utf8");

export default async function PhotoshopMcpPost() {
  const md = await content();
  const published = postDate(PUBLISHED)!;
  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Writing", url: "/blogs" }, { name: TITLE, url: `/blogs/${SLUG}` }]} />
      <ArticleSchema headline={TITLE} description={EXCERPT} datePublished={published.iso} dateModified={published.iso} image={IMAGE} url={`${SITE_URL}/blogs/${SLUG}`} authorName="Kathan Desai" authorUrl={`${SITE_URL}/about`} />
      <ReaderShell>
        <article id="reading-article" tabIndex={-1} className={styles.article} aria-labelledby="article-title">
          <header className={styles.articleHeader}>
            <Link className={styles.articleCategory} href="/blogs?category=Build%20notes">Build notes</Link>
            <h1 id="article-title">{TITLE}</h1>
            <div className={styles.byline}>
              <span>Kathan Desai</span>
              <time dateTime={published.iso}>{published.label}</time>
              <span>{readingMinutes(md)} min read</span>
            </div>
            <p className={styles.lede}>{EXCERPT}</p>
          </header>
          <div className={styles.heroMedia}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/photoshop-mcp/app-overview.jpg" alt="The Photoshop MCP app's overview tab" style={{ width: "100%", borderRadius: 12, display: "block" }} />
          </div>
          <MarkdownRenderer content={md} />
        </article>
      </ReaderShell>
    </>
  );
}
