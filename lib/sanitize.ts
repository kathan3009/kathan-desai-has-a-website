/**
 * Sanitizes objects before MongoDB operations to prevent NoSQL injection
 * and operator injection (e.g. $where, $function, $gt).
 */
export function sanitizeForMongo<T extends Record<string, unknown>>(obj: T): T {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return obj;
  }
  const sanitized = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$") || key.includes(".")) continue;
    sanitized[key] =
      value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)
        ? sanitizeForMongo(value as Record<string, unknown>)
        : value;
  }
  return sanitized as T;
}
