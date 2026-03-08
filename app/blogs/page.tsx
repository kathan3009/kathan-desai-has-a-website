import Link from "next/link";
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";
import { MediaBlock } from "@/components/MediaBlock";

export const metadata = {
  title: "Blogs",
  description: "Kathan Desai's blog posts on security, development, and more.",
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ category?: string }> };

export default async function BlogPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const conn = await dbConnect();
  const rawPosts = conn ? await Blog.find().sort({ publishedAt: -1 }).lean() : [];
  const allPosts = rawPosts.map((p) => ({
    ...p,
    _id: p._id?.toString?.() ?? p._id,
    videoEmbed: p.videoEmbed ?? "",
    featuredImage: p.featuredImage ?? "",
    content: p.content ?? "",
  }));
  const filteredPosts = category ? allPosts.filter((p) => p.category === category) : allPosts;

  const featured = filteredPosts.find((p) => p.isTopStory) || filteredPosts[0];
  const featuredId = featured?._id?.toString();
  const latest = filteredPosts.filter((p) => p._id.toString() !== featuredId);
  const mostRead = [...filteredPosts]
    .sort((a, b) => (b.readCount || 0) - (a.readCount || 0))
    .filter((p) => (p.readCount || 0) > 0);
  const categories = [...new Set(allPosts.map((p) => p.category).filter(Boolean))] as string[];

  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Blogs", url: "/blogs" }]} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <header className="mb-12">
          <p className="text-[10px] text-accent font-semibold uppercase tracking-[0.3em] mb-2">Thoughts</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Blogs</h1>
        </header>

        {categories.length > 0 && (
          <nav className="flex flex-wrap items-center gap-2 mb-10 pb-4 border-b border-border">
            <Link href="/blogs" className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${!category ? "bg-accent text-black" : "text-muted hover:text-accent"}`}>
              All Topics
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/blogs?category=${encodeURIComponent(cat)}`}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  category === cat ? "bg-accent text-black" : "text-muted hover:text-accent"
                }`}
              >
                {cat}
              </Link>
            ))}
          </nav>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">Most Read</h2>
            <div className="space-y-4">
              {mostRead.length === 0 ? (
                <p className="text-muted text-sm">Views are tracked when readers open posts.</p>
              ) : (
                mostRead.slice(0, 10).map((post) => (
                  <MostReadItem key={post._id.toString()} post={post} />
                ))
              )}
            </div>
          </aside>

          <main className="lg:col-span-6 order-1 lg:order-2">
            {featured && (
              <FeaturedArticle post={featured} />
            )}
            {latest.length > 0 && featured && (
              <div className="mt-8 space-y-4">
                {latest.slice(0, 3).map((post) => (
                  <SubArticle key={post._id.toString()} post={post} />
                ))}
              </div>
            )}
          </main>

          <aside className="lg:col-span-3 order-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-4">Latest</h2>
            <div className="space-y-6">
              {latest.length === 0 && !featured ? (
                <p className="text-muted text-sm">No posts yet.</p>
              ) : (
                (featured ? latest : filteredPosts).slice(0, 6).map((post, i) => (
                  <LatestItem key={post._id.toString()} post={post} isFirst={i === 0} />
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  publishedAt: string;
  category?: string;
  featuredImage?: string;
  videoEmbed?: string;
};

function extractYoutubeId(text: string): string | null {
  if (!text?.trim()) return null;
  const ytEmbed = text.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  const ytWatch = text.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
  const ytShort = text.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  return ytEmbed?.[1] ?? ytWatch?.[1] ?? ytShort?.[1] ?? null;
}

function getYoutubeThumbnail(videoEmbed?: string, content?: string): string | null {
  const vidId = extractYoutubeId(videoEmbed ?? "") ?? extractYoutubeId(content ?? "");
  return vidId ? `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` : null;
}

function Thumbnail({ src, videoEmbed, content, size = "square" }: { src?: string; videoEmbed?: string; content?: string; size?: "square" | "wide" }) {
  const dims = size === "square" ? "w-16 h-16" : "w-full aspect-video";
  const thumbnailSrc = src ?? getYoutubeThumbnail(videoEmbed, content);
  const hasVideo = !!(videoEmbed?.trim() || extractYoutubeId(content ?? ""));
  if (thumbnailSrc) {
    return (
      <div className={`shrink-0 overflow-hidden rounded bg-card ${dims} relative`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumbnailSrc} alt="" className="w-full h-full object-cover" />
        {!src && hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <svg className="w-5 h-5 text-black ml-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`shrink-0 rounded bg-gradient-to-br from-stone-200 to-stone-100 flex items-center justify-center ${dims}`}>
      <span className="text-muted/60 text-xl font-mono">/</span>
    </div>
  );
}

function MostReadItem({ post }: { post: BlogPost }) {
  const thumbSrc = post.featuredImage || getYoutubeThumbnail(post.videoEmbed, post.content);
  return (
    <Link href={`/blogs/${post.slug}`} className="flex gap-3 group">
      <div className="shrink-0 w-16 h-16 rounded overflow-hidden bg-card relative">
        {thumbSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
            {!post.featuredImage && (post.videoEmbed || extractYoutubeId(post.content ?? "")) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                  <svg className="w-4 h-4 text-black ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-200 to-stone-100">
            <span className="text-muted/60 text-xl font-mono">/</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {post.category && (
          <span className="text-[10px] text-accent font-semibold uppercase tracking-wider">{post.category}</span>
        )}
        <h3 className="text-foreground text-sm font-medium group-hover:text-accent transition-colors line-clamp-2 mt-0.5">
          {post.title}
        </h3>
      </div>
    </Link>
  );
}

function FeaturedArticle({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blogs/${post.slug}`} className="block group">
      <article>
        <div className="overflow-hidden rounded-lg bg-card mb-4 w-full aspect-video">
          {(post.featuredImage || post.videoEmbed) ? (
            <MediaBlock image={post.featuredImage} videoEmbed={post.videoEmbed} alt={post.title} variant="project-card" className="w-full h-full" />
          ) : (
            <div className="w-full h-full rounded bg-gradient-to-br from-stone-200 to-stone-100 flex items-center justify-center">
              <span className="text-muted/60 text-xl font-mono">/</span>
            </div>
          )}
        </div>
        {post.category && (
          <span className="text-xs text-accent font-semibold uppercase tracking-wider">{post.category}</span>
        )}
        <h2 className="text-xl md:text-2xl font-bold text-foreground group-hover:text-accent transition-colors mt-2 leading-tight">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="text-muted text-sm md:text-base mt-3 line-clamp-3 leading-relaxed">{post.excerpt}</p>
        )}
        <p className="text-muted text-sm mt-4">
          {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      </article>
    </Link>
  );
}

function SubArticle({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blogs/${post.slug}`} className="flex gap-4 group py-3 border-t border-border">
      <Thumbnail src={post.featuredImage} videoEmbed={post.videoEmbed} content={post.content} size="square" />
      <div className="min-w-0 flex-1">
        <h3 className="text-foreground font-medium group-hover:text-accent transition-colors line-clamp-2">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-muted text-sm mt-1 line-clamp-2">{post.excerpt}</p>
        )}
      </div>
    </Link>
  );
}

function LatestItem({ post, isFirst }: { post: BlogPost; isFirst?: boolean }) {
  return (
    <Link href={`/blogs/${post.slug}`} className="block group">
      {isFirst ? (
        <article>
          <div className="overflow-hidden rounded-lg bg-card mb-3 w-full aspect-video">
            {(post.featuredImage || post.videoEmbed) ? (
              <MediaBlock image={post.featuredImage} videoEmbed={post.videoEmbed} alt={post.title} variant="project-card" className="w-full h-full" />
            ) : (
              <div className="w-full h-full rounded bg-gradient-to-br from-stone-200 to-stone-100 flex items-center justify-center">
                <span className="text-muted/60 text-xl font-mono">/</span>
              </div>
            )}
          </div>
          {post.category && (
            <span className="text-[10px] text-accent font-semibold uppercase tracking-wider">{post.category}</span>
          )}
          <h3 className="text-foreground font-semibold group-hover:text-accent transition-colors mt-1 line-clamp-2">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-muted text-sm mt-2 line-clamp-2">{post.excerpt}</p>
          )}
          <p className="text-muted text-xs mt-2">
            {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </article>
      ) : (
        <article className="flex gap-3 py-3 border-t border-border">
          <Thumbnail src={post.featuredImage} videoEmbed={post.videoEmbed} content={post.content} size="square" />
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground text-sm font-medium group-hover:text-accent transition-colors line-clamp-2">
              {post.title}
            </h3>
            <p className="text-muted text-xs mt-1">
              {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        </article>
      )}
    </Link>
  );
}
