"use client";

import { useState } from "react";
import Image from "next/image";
import { extractYoutubeId, getYoutubeThumbnailUrl } from "@/lib/youtube";

type MediaVariant = "project-card" | "blog-banner" | "blog-thumbnail" | "blog-card" | "blog-hero";

const variantConfig: Record<
  MediaVariant,
  { aspect: string; fit: "contain" | "cover"; size?: string; padding?: string }
> = {
  "project-card": { aspect: "", fit: "contain", padding: "p-2", size: "w-full h-full" },
  "blog-banner": { aspect: "", fit: "cover", padding: "", size: "w-full h-full" },
  "blog-thumbnail": { aspect: "aspect-[3/2]", fit: "contain", size: "w-24 h-16 shrink-0", padding: "p-1" },
  "blog-card": { aspect: "aspect-[8/5]", fit: "contain", size: "w-32 h-20 shrink-0", padding: "p-1" },
  "blog-hero": { aspect: "aspect-video", fit: "cover", padding: "" },
};

const variantSizes: Record<MediaVariant, string> = {
  "project-card": "(max-width: 768px) 100vw, 500px",
  "blog-banner": "(max-width: 1024px) 100vw, 512px",
  "blog-thumbnail": "96px",
  "blog-card": "128px",
  "blog-hero": "(max-width: 768px) 100vw, 768px",
};

function isOptimizable(url: string): boolean {
  if (url.startsWith("/")) return true;
  try {
    const u = new URL(url);
    return u.hostname.endsWith(".r2.dev") || u.hostname === "img.youtube.com";
  } catch {
    return false;
  }
}

function isDirectVideo(url?: string): boolean {
  if (!url) return false;
  try {
    return /\.(mp4|webm|mov)(?:$|[?#])/i.test(new URL(url, "https://portfolio.local").pathname);
  } catch {
    return false;
  }
}

type MediaBlockProps = {
  image?: string;
  videoEmbed?: string;
  content?: string;
  alt?: string;
  variant?: MediaVariant;
  className?: string;
  priority?: boolean;
  prioritizeVideo?: boolean;
};

function normalizeVideoEmbed(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const ytEmbed = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  const ytWatch = trimmed.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
  const ytShort = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  const vidId = ytEmbed?.[1] ?? ytWatch?.[1] ?? ytShort?.[1];
  if (vidId) {
    return `<iframe src="https://www.youtube.com/embed/${vidId}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }
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
  priority = false,
  prioritizeVideo = false,
}: MediaBlockProps) {
  const [loaded, setLoaded] = useState(false);
  const youtubeThumbnail = getYoutubeThumbnailUrl(videoEmbed, content);
  const directVideo = isDirectVideo(videoEmbed) ? videoEmbed?.trim() : "";
  const hasVideo = !!(directVideo || videoEmbed?.trim() || youtubeThumbnail);
  if (!image && !videoEmbed && !youtubeThumbnail) return null;

  const { aspect, fit, size, padding } = variantConfig[variant];
  const objectFit = fit === "contain" ? "object-contain" : "object-cover";
  const sizes = variantSizes[variant];
  const vidIdFromContent = extractYoutubeId(content ?? "");
  const embedHtml =
    videoEmbed
      ? normalizeVideoEmbed(videoEmbed)
      : vidIdFromContent
        ? `<iframe src="https://www.youtube.com/embed/${vidIdFromContent}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
        : "";

  const isProjectCard = variant === "project-card";
  const isBlogBanner = variant === "blog-banner";

  const showThumbnailForVideo =
    youtubeThumbnail &&
    (variant === "blog-banner" || variant === "project-card" || variant === "blog-card" || variant === "blog-thumbnail");

  const showVideo = hasVideo && (prioritizeVideo || !image);
  const showDirectVideo = directVideo && variant === "blog-hero" && showVideo;
  const showIframe = !showDirectVideo && embedHtml && variant === "blog-hero" && showVideo;
  // Direct video is playable only in the article hero; listings retain the editorial poster.
  const showImage = image && (!prioritizeVideo || !hasVideo || (!!directVideo && variant !== "blog-hero"));
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
      {showDirectVideo ? (
        <video
          className="absolute inset-0 h-full w-full bg-black object-cover"
          src={directVideo}
          poster={image}
          controls
          playsInline
          preload="metadata"
          aria-label={`${alt} product explainer`}
        />
      ) : showIframe ? (
        <div
          className="absolute inset-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full"
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
      ) : showImg && imgSrc ? (
        <>
          <Image
            src={imgSrc}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            unoptimized={!isOptimizable(imgSrc)}
            onLoad={() => setLoaded(true)}
            className={`${objectFit} ${padding ?? ""} ${isProjectCard && !isBlogBanner ? "media-project-img" : ""} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
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
