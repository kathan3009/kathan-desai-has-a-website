import type { Metadata } from "next";
import { AUTHOR, FEED_ALTERNATE, SITE_NAME } from "./site";

// Each page owns its URL and preview text; Next replaces nested metadata
// objects rather than merging alternates/Open Graph field by field.
export function pageMetadata({ title, description, path, index = true }: {
  title: string; description: string; path: string; index?: boolean;
}): Metadata {
  return {
    title: { absolute: `${title} | ${SITE_NAME}` },
    description,
    alternates: { canonical: path, types: FEED_ALTERNATE },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", title, description, url: path },
    twitter: { card: "summary_large_image", creator: AUTHOR.handle, title, description },
    robots: { index, follow: true, googleBot: { index, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  };
}
