"use client";

import { extractYoutubeId, getYoutubeThumbnailUrl } from "@/lib/youtube";

/**
 * Media display standard — consistent sizing per section type.
 *
 * Variants:
 * - project-card: 16:9, object-contain — logos/product images shown fully (no crop)
 * - blog-banner: 16:9, object-cover — blog cards, fills container, shows YouTube thumbnail when video-only
 * - blog-thumbnail: 3:2, object-contain — small list previews
 * - blog-card: 8:5, object-contain — blog list cards
 * - blog-hero: 21:9, object-cover — full-width post header (shows iframe for video)
 */

type MediaVariant = "project-card" | "blog-banner" | "blog-thumbnail" | "blog-card" | "blog-hero";

const variantConfig: Record<
  MediaVariant,
  { aspect: string; fit: "contain" | "cover"; size?: string; padding?: string }
> = {
  "project-card": { aspect: "", fit: "contain", padding: "p-2", size: "w-full h-full" },
  "blog-banner": { aspect: "", fit: "cover", padding: "", size: "w-full h-full" },
  "blog-thumbnail": { aspect: "aspect-[3/2]", fit: "contain", size: "w-24 h-16 shrink-0", padding: "p-1" },
  "blog-card": { aspect: "aspect-[8/5]", fit: "contain", size: "w-32 h-20 shrink-0", padding: "p-1" },
  "blog-hero": { aspect: "aspect-[21/9]", fit: "cover", padding: "" },
};

type MediaBlockProps = {
  image?: string;
  videoEmbed?: string;
  content?: string;
  alt?: string;
  variant?: MediaVariant;
  className?: string;
  /** When true (e.g. /blogs/[slug]): show video over image. When false (e.g. /blogs): show image over video. */
  prioritizeVideo?: boolean;
};

function normalizeVideoEmbed(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Raw YouTube URLs -> safe iframe
  const ytEmbed = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  const ytWatch = trimmed.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
  const ytShort = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  const vidId = ytEmbed?.[1] ?? ytWatch?.[1] ?? ytShort?.[1];
  if (vidId) {
    return `<iframe src="https://www.youtube.com/embed/${vidId}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }
  // Only allow existing iframes that point to YouTube embed
  if (trimmed.startsWith("<iframe")) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/);
    const src = srcMatch?.[1] ?? "";
    if (src.includes("youtube.com/embed/") || src.includes("youtube-nocookie.com/embed/")) {
      return trimmed;
    }
  }
  return "";
}

export function MediaBlock({
  image,
  videoEmbed,
  content,
  alt = "",
  variant = "project-card",
  className = "",
  prioritizeVideo = false,
}: MediaBlockProps) {
  const youtubeThumbnail = getYoutubeThumbnailUrl(videoEmbed, content);
  const hasVideo = !!(videoEmbed?.trim() || youtubeThumbnail);
  if (!image && !videoEmbed && !youtubeThumbnail) return null;

  const { aspect, fit, size, padding } = variantConfig[variant];
  const objectFit = fit === "contain" ? "object-contain" : "object-cover";
  const vidIdFromContent = extractYoutubeId(content ?? "");
  const embedHtml =
    videoEmbed
      ? normalizeVideoEmbed(videoEmbed)
      : vidIdFromContent
        ? `<iframe src="https://www.youtube.com/embed/${vidIdFromContent}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
        : "";

  const isProjectCard = variant === "project-card";
  const isBlogBanner = variant === "blog-banner";

  // For card/thumbnail variants: show YouTube thumbnail image instead of iframe (iframe shows black)
  // For blog-hero: show iframe so users can play video on the post page
  const showThumbnailForVideo =
    youtubeThumbnail &&
    (variant === "blog-banner" || variant === "project-card" || variant === "blog-card" || variant === "blog-thumbnail");

  // prioritizeVideo (e.g. /blogs/[slug]): video over image. Otherwise (/blogs): image over video
  const showVideo = hasVideo && (prioritizeVideo || !image);
  const showIframe = embedHtml && variant === "blog-hero" && showVideo;
  const showImage = image && (!prioritizeVideo || !hasVideo);
  const showThumbnail = hasVideo && showThumbnailForVideo && (prioritizeVideo || !image);
  const showImg = showImage || showThumbnail;
  const imgSrc = showImage ? image : showThumbnail ? youtubeThumbnail : null;

  return (
    <div
      className={`
        rounded overflow-hidden bg-card relative
        ${isProjectCard ? "media-project-card" : ""}
        ${size ? size : `${aspect} w-full`}
        ${className}
      `}
    >
      {showIframe ? (
        <div
          className="absolute inset-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full"
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
      ) : showImg && imgSrc ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={alt}
            className={`w-full h-full ${objectFit} ${padding} ${isProjectCard && !isBlogBanner ? "media-project-img" : ""}`}
          />
          {showThumbnail && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                <svg className="w-6 h-6 text-black ml-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
