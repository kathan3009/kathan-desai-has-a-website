import Link from "next/link";
import type { Metadata } from "next";
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import { extractYoutubeId } from "@/lib/youtube";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";
import { MediaBlock } from "@/components/MediaBlock";
import { matchesSearch, postDate, readingMinutes } from "@/components/reading/post-utils";
import styles from "@/components/reading/reading.module.css";

export const metadata: Metadata = {
  title: "Writing",
  description: "Kathan Desai's blog posts on security, development, and more.",
  alternates: { canonical: "/blogs" },
};
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ category?: string | string[]; q?: string | string[]; sort?: string | string[] }> };
type Post = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  publishedAt: Date | string;
  category: string;
  featuredImage: string;
  videoEmbed: string;
  audioUrl: string;
  isTopStory: boolean;
  readCount: number;
  tags: string[];
};
const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function BlogPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = single(params.category);
  const query = single(params.q).trim();
  const sort = single(params.sort) === "popular" ? "popular" : "newest";
  const conn = await dbConnect();
  const rawPosts = conn ? await Blog.find()
    .select("_id title slug excerpt content featuredImage videoEmbed audioUrl publishedAt category isTopStory readCount tags")
    .sort({ publishedAt: -1 }).lean() : [];
  const posts: Post[] = rawPosts.map(p => ({
    _id: String(p._id), title: p.title, slug: p.slug, excerpt: p.excerpt ?? "", content: p.content ?? "",
    publishedAt: p.publishedAt, category: p.category ?? "", featuredImage: p.featuredImage ?? "",
    videoEmbed: p.videoEmbed ?? "", audioUrl: p.audioUrl ?? "", isTopStory: !!p.isTopStory,
    readCount: p.readCount ?? 0, tags: p.tags ?? [],
  }));
  const categories = [...new Set(posts.map(p => p.category).filter(Boolean))].sort();
  const filtered = posts.filter(p => (!category || p.category === category) && matchesSearch(query, [p.title, p.excerpt, p.content, p.category, ...p.tags]));
  if (sort === "popular") filtered.sort((a, b) => b.readCount - a.readCount);
  const featured = !query && sort === "newest" ? filtered.find(p => p.isTopStory) ?? filtered[0] : undefined;
  const remaining = filtered.filter(p => p._id !== featured?._id);
  function filterURL(next: { category?: string; sort?: string }) {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (next.category ?? category) search.set("category", next.category ?? category);
    if ((next.sort ?? sort) === "popular") search.set("sort", "popular");
    return `/blogs${search.size ? `?${search}` : ""}`;
  }

  return (
    <div className={`${styles.surface} ${styles.index}`}>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Writing", url: "/blogs" }]} />
      <div className={styles.indexInner}>
        <header className={styles.indexHeader}>
          <h1>Writing</h1>
          <p>Build notes, security, and ideas I wanted to work through in public.</p>
        </header>
        <form action="/blogs" method="get" role="search" className={styles.search}>
          <label htmlFor="writing-search">Search the writing</label>
          <div className={styles.searchRow}>
            <input key={query} id="writing-search" name="q" type="search" defaultValue={query} placeholder="Search posts, ideas, or topics" />
            {category && <input type="hidden" name="category" value={category} />}
            {sort === "popular" && <input type="hidden" name="sort" value={sort} />}
            <button type="submit">Search</button>
          </div>
        </form>
        <nav className={styles.topics} aria-label="Writing topics">
          <Link href={filterURL({ category: "" })} aria-current={!category ? "page" : undefined}>All topics</Link>
          {categories.map(cat => <Link key={cat} href={filterURL({ category: cat })} aria-current={category === cat ? "page" : undefined}>{cat}</Link>)}
        </nav>
        <div className={styles.resultsBar}>
          <p role="status">{filtered.length} {filtered.length === 1 ? "post" : "posts"}{query && <> matching “{query}”</>}{category && <> in {category}</>}</p>
          <nav aria-label="Sort writing"><Link href={filterURL({ sort: "newest" })} aria-current={sort === "newest" ? "page" : undefined}>Newest</Link><Link href={filterURL({ sort: "popular" })} aria-current={sort === "popular" ? "page" : undefined}>Most read</Link></nav>
        </div>
        {featured && <PostItem post={featured} featured />}
        {remaining.length > 0 && <div>{remaining.map(post => <PostItem key={post._id} post={post} popular={sort === "popular"} />)}</div>}
        {filtered.length === 0 && <div className={styles.empty}>
          <h2>{query || category ? "No matching posts" : "No posts yet"}</h2>
          <p>{query || category ? "Try a different phrase or browse all the writing." : "New writing will appear here."}</p>
          {(query || category) && <Link href="/blogs">Clear search and filters</Link>}
        </div>}
      </div>
    </div>
  );
}

function PostItem({ post, featured = false, popular = false }: { post: Post; featured?: boolean; popular?: boolean }) {
  const date = postDate(post.publishedAt);
  const hasMedia = !!(post.featuredImage || post.videoEmbed || extractYoutubeId(post.content));
  return (
    <article className={featured ? styles.featuredPost : styles.post}>
      <div className={styles.postCopy}>
        <div className={styles.postMeta}>
          {featured && <span>{post.isTopStory ? "Featured" : "Latest post"}</span>}
          {post.category && <span>{post.category}</span>}
          {post.audioUrl && <span>Audio available</span>}
        </div>
        <h2><Link href={`/blogs/${encodeURIComponent(post.slug)}`} prefetch={false}>{post.title}</Link></h2>
        {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
        <div className={styles.postMeta}>
          {date && <time dateTime={date.iso}>{date.label}</time>}
          <span>{readingMinutes(post.content)} min read</span>
          {popular && post.readCount > 0 && <span>{post.readCount.toLocaleString("en-US")} reads</span>}
        </div>
      </div>
      {hasMedia && <Link href={`/blogs/${encodeURIComponent(post.slug)}`} prefetch={false} className={styles.postMedia} aria-label={`Read ${post.title}`} tabIndex={-1}>
        <MediaBlock image={post.featuredImage} videoEmbed={post.videoEmbed} content={post.content} alt="" variant="blog-banner" className="w-full h-full" prioritizeVideo={featured} priority={featured} />
      </Link>}
    </article>
  );
}
