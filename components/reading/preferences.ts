export type ReadingPreferences = {
  theme: "paper" | "sepia" | "dark";
  size: number;
  typeface: "serif" | "sans";
  width: "narrow" | "standard" | "wide";
  spacing: "compact" | "relaxed" | "spacious";
};

export const READING_KEY = "kathan-reading-v1";
export const defaultPreferences: ReadingPreferences = {
  theme: "paper",
  size: 22,
  typeface: "serif",
  width: "standard",
  spacing: "relaxed",
};

// Treat saved browser data as untrusted; old or malformed settings use defaults.
export function parsePreferences(raw: string | null): ReadingPreferences {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object" || Array.isArray(value)) return defaultPreferences;
    const p = value as Record<string, unknown>;
    return {
      theme: p.theme === "sepia" || p.theme === "dark" ? p.theme : "paper",
      size: typeof p.size === "number" && Number.isFinite(p.size)
        ? Math.max(18, Math.min(30, Math.round(p.size))) : defaultPreferences.size,
      typeface: p.typeface === "sans" ? "sans" : "serif",
      width: p.width === "narrow" || p.width === "wide" ? p.width : "standard",
      spacing: p.spacing === "compact" || p.spacing === "spacious" ? p.spacing : "relaxed",
    };
  } catch {
    return defaultPreferences;
  }
}
