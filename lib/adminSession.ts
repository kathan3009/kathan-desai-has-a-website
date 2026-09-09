// Shared by Node route handlers and Edge middleware. Keep Node-only imports out.
export const ADMIN_COOKIE = "admin-auth";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

export function isValidCredential(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 4096) {
    return false;
  }
  // Reject control characters and unpaired surrogates rather than allowing
  // TextEncoder to replace malformed Unicode during credential comparison.
  for (const character of value) {
    const code = character.codePointAt(0)!;
    if (code < 32 || code === 127 || (code >= 0xd800 && code <= 0xdfff)) {
      return false;
    }
  }
  return true;
}

export function getAdminCredentials(): { username: string; password: string } | null {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!isValidCredential(username) || !isValidCredential(password)) return null;
  return { username, password };
}

async function signingKey(): Promise<CryptoKey | null> {
  const credentials = getAdminCredentials();
  if (!credentials) return null;
  const secret = process.env.ADMIN_SESSION_SECRET || credentials.password;
  if (!isValidCredential(secret)) return null;

  // Domain separation also binds sessions to the current credentials: changing
  // either credential or the optional secret invalidates outstanding sessions.
  const material = JSON.stringify([
    "admin-session-v1",
    secret,
    credentials.username,
    credentials.password,
  ]);
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(material),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

export async function createAdminSession(): Promise<string> {
  const key = await signingKey();
  if (!key) throw new Error("Admin authentication is not configured");
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ADMIN_SESSION_MAX_AGE;
  const nonce = encodeBase64Url(crypto.getRandomValues(new Uint8Array(16)));
  const payload = `v1.${issuedAt}.${expiresAt}.${nonce}`;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAdminSession(value: unknown): Promise<boolean> {
  // Bound work and accept only this version's exact, canonical wire format.
  if (typeof value !== "string" || value.length > 128) return false;
  const match = /^v1\.([1-9]\d{0,12})\.([1-9]\d{0,12})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(value);
  if (!match || match[0] !== value) return false;

  try {
    const issuedAt = Number(match[1]);
    const expiresAt = Number(match[2]);
    const now = Math.floor(Date.now() / 1000);
    if (issuedAt > now || expiresAt <= now || expiresAt - issuedAt !== ADMIN_SESSION_MAX_AGE) {
      return false;
    }
    const nonce = decodeBase64Url(match[3]);
    const signature = decodeBase64Url(match[4]);
    if (encodeBase64Url(nonce) !== match[3] || encodeBase64Url(signature) !== match[4]) {
      return false;
    }
    const key = await signingKey();
    if (!key) return false;
    return await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(value.slice(0, value.lastIndexOf("."))),
    );
  } catch {
    return false;
  }
}
