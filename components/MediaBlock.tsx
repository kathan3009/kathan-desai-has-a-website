"use client";

/**
 * Media display standard — consistent sizing per section type.
 *
 * Variants:
 * - project-card: 16:9, object-contain — logos/product images shown fully (no crop)
 * - blog-thumbnail: 3:2, object-contain — small list previews
 * - blog-card: 8:5, object-contain — blog list cards
 * - blog-hero: 21:9, object-cover — full-width post header
 */

type MediaVariant = "project-card" | "blog-thumbnail" | "blog-card" | "blog-hero";

const variantConfig: Record<
  MediaVariant,
  { aspect: string; fit: "contain" | "cover"; size?: string; padding?: string }
> = {
  "project-card": { aspect: "", fit: "contain", padding: "p-2", size: "w-full h-full" },
  "blog-thumbnail": { aspect: "aspect-[3/2]", fit: "contain", size: "w-24 h-16 shrink-0", padding: "p-1" },
  "blog-card": { aspect: "aspect-[8/5]", fit: "contain", size: "w-32 h-20 shrink-0", padding: "p-1" },
  "blog-hero": { aspect: "aspect-[21/9]", fit: "cover", padding: "" },
};

type MediaBlockProps = {
  image?: string;
  videoEmbed?: string;
  alt?: string;
  variant?: MediaVariant;
  className?: string;
};

function normalizeVideoEmbed(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Already iframe HTML
  if (trimmed.startsWith("<iframe")) return trimmed;
  // Raw YouTube URLs -> iframe
  const ytEmbed = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  const ytWatch = trimmed.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
  const ytShort = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  const vidId = ytEmbed?.[1] ?? ytWatch?.[1] ?? ytShort?.[1];
  if (vidId) {
    return `<iframe src="https://www.youtube.com/embed/${vidId}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }
  return trimmed;
}

export function MediaBlock({
  image,
  videoEmbed,
  alt = "",
  variant = "project-card",
  className = "",
}: MediaBlockProps) {
  if (!image && !videoEmbed) return null;

  const { aspect, fit, size, padding } = variantConfig[variant];
  const objectFit = fit === "contain" ? "object-contain" : "object-cover";
  const embedHtml = videoEmbed ? normalizeVideoEmbed(videoEmbed) : "";

  const isProjectCard = variant === "project-card";

  return (
    <div
      className={`
        rounded overflow-hidden bg-card relative
        ${isProjectCard ? "media-project-card" : ""}
        ${size ? size : `${aspect} w-full`}
        ${className}
      `}
    >
      {embedHtml ? (
        <div
          className="absolute inset-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full"
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
      ) : image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={alt}
          className={`w-full h-full ${objectFit} ${padding} ${isProjectCard ? "media-project-img" : ""}`}
        />
      ) : null}
    </div>
  );
}
