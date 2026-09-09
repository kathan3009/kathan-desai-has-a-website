export function readingMinutes(content: string): number {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).filter(Boolean).length / 220));
}

export function postDate(value: Date | string): { iso: string; label: string } | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return {
    iso: date.toISOString(),
    label: date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }),
  };
}

export function matchesSearch(query: string, fields: (string | undefined)[]): boolean {
  const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-US");
  const text = normalize(fields.filter(Boolean).join(" "));
  return normalize(query).trim().split(/\s+/).every(word => text.includes(word));
}
