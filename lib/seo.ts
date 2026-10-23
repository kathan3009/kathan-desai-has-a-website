// Turn markdown into the plain sentence search engines and link previews show.
export function plainText(markdown: string, max = 160): string {
  const text = String(markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_`~]+/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, Math.max(0, max - 1));
  const boundary = cut.lastIndexOf(" ");
  return `${(boundary > max / 2 ? cut.slice(0, boundary) : cut).trim()}…`;
}
