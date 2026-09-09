import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "./auth";

export class AdminRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "AdminRequestError";
  }
}

export function adminJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function adminErrorResponse(error: unknown): NextResponse {
  if (error instanceof AdminRequestError) {
    return adminJson({ error: error.message }, error.status);
  }
  const details = error && typeof error === "object"
    ? error as { name?: unknown; code?: unknown }
    : {};
  if (details.code === 11000) {
    return adminJson({ error: "A record with this unique value already exists." }, 409);
  }
  if (details.name === "ValidationError" || details.name === "CastError" || details.name === "StrictModeError") {
    return adminJson({ error: "Invalid data. Check the required fields and their values." }, 400);
  }
  if (typeof details.name === "string" && [
    "MongooseServerSelectionError", "MongoServerSelectionError",
    "MongoNetworkError", "MongoNetworkTimeoutError", "MongoNotConnectedError",
    "MongoTopologyClosedError", "MongoServerClosedError",
  ].includes(details.name)) {
    return adminJson({ error: "Database unavailable. Please try again later." }, 503);
  }
  // Do not return database queries, connection strings, or provider error text.
  return adminJson({ error: "Server error. Please try again later." }, 500);
}

export async function withAdminErrors(action: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await action();
  } catch (error) {
    return adminErrorResponse(error);
  }
}

function configuredOrigin(value: string): string {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Invalid origin configuration");
  }
  return url.origin;
}

/** Browser mutations only. Never derive trust from Origin or forwarded headers. */
export function requireAdminOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin.length > 2048) {
    throw new AdminRequestError(403, "Forbidden: a valid same-origin request is required.");
  }
  try {
    // Origin must be a single serialized HTTP(S) origin, without path or credentials.
    if (configuredOrigin(origin) !== origin) throw new Error("Invalid origin");
  } catch {
    throw new AdminRequestError(403, "Forbidden: a valid same-origin request is required.");
  }

  let requestOrigin: string;
  try {
    const url = new URL(request.url);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      throw new Error("Invalid request URL");
    }
    // Next supplies the target URL; Host/X-Forwarded-Host are not used here.
    requestOrigin = url.origin;
  } catch {
    throw new AdminRequestError(403, "Forbidden: invalid request origin.");
  }

  const trustedOrigins = new Set([requestOrigin]);
  try {
    for (const value of [process.env.SITE_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
      if (value) trustedOrigins.add(configuredOrigin(value));
    }
    if (process.env.VERCEL_URL) {
      trustedOrigins.add(configuredOrigin(`https://${process.env.VERCEL_URL}`));
    }
  } catch {
    throw new AdminRequestError(503, "Admin origin configuration is unavailable.");
  }
  if (!trustedOrigins.has(origin)) {
    throw new AdminRequestError(403, "Forbidden: request origin is not allowed.");
  }
}

export async function requireAdminAuthentication(): Promise<void> {
  if (!(await isAdminAuthenticated())) throw new AdminRequestError(401, "Unauthorized");
}

export function requireAdminDatabase(connection: unknown): void {
  if (!connection) throw new AdminRequestError(503, "Database unavailable. Please try again later.");
}

export function parseAdminId(id: unknown): string {
  if (typeof id !== "string" || id.length !== 24 || !/^[a-f0-9]{24}$/i.test(id)) {
    throw new AdminRequestError(400, "Invalid record ID.");
  }
  return id;
}

export async function readAdminJson(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (type !== "application/json") {
    throw new AdminRequestError(400, "Content-Type must be application/json.");
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AdminRequestError(400, "Invalid JSON request body.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AdminRequestError(400, "Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}
