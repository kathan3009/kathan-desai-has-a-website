/**
 * Shared YouTube URL extraction — used for thumbnails and embeds.
 * Supports: youtube.com/watch?v=, youtu.be/, embed URLs, markdown links.
 */

const YOUTUBE_PATTERNS = [
  // Embed URLs
  /(?:youtube\.com|youtube-nocookie\.com)\/embed\/([a-zA-Z0-9_-]+)/,
  // Watch URLs (with optional params before v=)
  /youtube\.com\/watch\?[^&\s]*v=([a-zA-Z0-9_-]+)/,
  // Short URLs
  /youtu\.be\/([a-zA-Z0-9_-]+)/,
  // Markdown links [text](url) - the URL might be in parentheses
  /\(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
];

export function extractYoutubeId(text: string | undefined | null): string | null {
  if (!text?.trim()) return null;
  for (const re of YOUTUBE_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function getYoutubeThumbnailUrl(
  videoEmbed?: string | null,
  content?: string | null
): string | null {
  const vidId = extractYoutubeId(videoEmbed ?? "") ?? extractYoutubeId(content ?? "");
  return vidId ? `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` : null;
}
