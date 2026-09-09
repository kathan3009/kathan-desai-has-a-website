import { S3Client, PutObjectCommand, HeadObjectCommand, GetBucketCorsCommand, PutBucketCorsCommand, type CORSRule } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 25 * 1024 * 1024;
// Leave room below Vercel's request limit for multipart overhead.
export const LEGACY_BODY_MAX_BYTES = 4 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/avif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/gif": "gif",
  "image/webp": "webp", "image/avif": "avif", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
};
const PRESIGN_SECONDS = 10 * 60;
const RECEIPT_SECONDS = 60 * 60;
export type MediaType = "image" | "video";

export class UploadError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

export function getMediaType(mime: string): MediaType | null {
  if (IMAGE_TYPES.includes(mime)) return "image";
  if (VIDEO_TYPES.includes(mime)) return "video";
  return null;
}
export function getMaxBytes(mime: string): number | null {
  const type = getMediaType(mime);
  return type === "image" ? IMAGE_MAX_BYTES : type === "video" ? VIDEO_MAX_BYTES : null;
}
export function validateFile(file: { type: string; size: number }): { ok: true } | { ok: false; error: string } {
  const mime = typeof file.type === "string" ? file.type.toLowerCase() : "";
  const maxBytes = getMaxBytes(mime);
  if (!maxBytes) return { ok: false, error: "Invalid file type. Allowed: images (JPEG, PNG, GIF, WebP, AVIF) and videos (MP4, WebM, MOV)." };
  if (!Number.isSafeInteger(file.size) || file.size <= 0) return { ok: false, error: "Choose a nonempty file with a valid size." };
  if (file.size > maxBytes) return { ok: false, error: `File too large. Max size for ${getMediaType(mime)}s: ${maxBytes / 1024 / 1024}MB.` };
  return { ok: true };
}

// Folder input can only select safe path segments. Filenames/extensions are server-generated.
export function validateUploadSubdir(value: unknown): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") throw new UploadError("Folder must be text.");
  const folder = value.trim();
  if (!folder) return undefined;
  if (folder.length > 160 || !folder.split("/").every(part => /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(part))) {
    throw new UploadError("Use folder names with letters, numbers, dashes or underscores, separated by single slashes (for example, blog/photos).");
  }
  return folder;
}
function objectKey(type: string, subdir?: string): string {
  const folder = validateUploadSubdir(subdir);
  return `${folder ? `${folder}/` : ""}${randomUUID()}.${EXTENSIONS[type]}`;
}
function configuration() {
  const { R2_ACCOUNT_ID: accountId, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey, R2_BUCKET_NAME: bucket, R2_PUBLIC_URL: publicUrl } = process.env;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new UploadError("R2 uploads are not configured. Ask the site administrator to check the R2 environment settings.", 503);
  }
  let base: URL;
  try { base = new URL(publicUrl); } catch { throw new UploadError("R2 public URL is not configured correctly.", 503); }
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) {
    throw new UploadError("R2 public URL must be an HTTPS URL without credentials, a query or a fragment.", 503);
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl: base.href.replace(/\/+$/, "") };
}
function getR2Client(config: ReturnType<typeof configuration>): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    // Avoid SDK-generated checksums for an empty body when presigning a browser PUT.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}
function publicObjectUrl(base: string, key: string): string {
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

type UploadReceipt = { version: 1; key: string; type: string; size: number; bucket: string; expires: number };
function signReceipt(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(`r2-upload-receipt-v1:${payload}`).digest();
}

export async function prepareR2Upload(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new UploadError("Expected upload details.");
  const fields = input as Record<string, unknown>;
  if (typeof fields.type !== "string" || typeof fields.size !== "number") throw new UploadError("File type and size are required.");
  const type = fields.type.toLowerCase();
  const size = fields.size;
  const validation = validateFile({ type, size });
  if (!validation.ok) throw new UploadError(validation.error, getMaxBytes(type) && size > getMaxBytes(type)! ? 413 : 400);
  const key = objectKey(type, validateUploadSubdir(fields.subdir));
  const config = configuration();
  const client = getR2Client(config);
  try {
    const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
      Bucket: config.bucket, Key: key, ContentType: type, ContentLength: size,
    }), {
      expiresIn: PRESIGN_SECONDS,
      // The browser sets Content-Length from the File body; JS must not set this forbidden header.
      signableHeaders: new Set(["content-type", "content-length"]),
    });
    const receipt: UploadReceipt = { version: 1, key, type, size, bucket: config.bucket, expires: Math.floor(Date.now() / 1000) + RECEIPT_SECONDS };
    const payload = Buffer.from(JSON.stringify(receipt)).toString("base64url");
    return { uploadUrl, token: `${payload}.${signReceipt(payload, config.secretAccessKey).toString("base64url")}`, headers: { "Content-Type": type }, expiresIn: PRESIGN_SECONDS };
  } finally { client.destroy(); }
}

// A server-authenticated receipt prevents completion requests for arbitrary bucket objects.
// HEAD is read-only and retryable; the public URL is returned only after R2 confirms metadata.
export async function finalizeR2Upload(token: unknown): Promise<string> {
  if (typeof token !== "string" || token.length > 2048) throw new UploadError("Invalid upload confirmation.");
  const match = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match || match[0] !== token) throw new UploadError("Invalid upload confirmation.");
  const config = configuration();
  const actual = Buffer.from(match[2], "base64url");
  const expected = signReceipt(match[1], config.secretAccessKey);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new UploadError("Invalid upload confirmation.");
  let receipt: UploadReceipt;
  try { receipt = JSON.parse(Buffer.from(match[1], "base64url").toString("utf8")); }
  catch { throw new UploadError("Invalid upload confirmation."); }
  if (!receipt || receipt.version !== 1 || receipt.bucket !== config.bucket || !Number.isSafeInteger(receipt.expires) || receipt.expires <= Math.floor(Date.now() / 1000)) {
    throw new UploadError("Upload confirmation has expired. Select the file again to start a new upload.", 410);
  }
  if (typeof receipt.key !== "string" || typeof receipt.type !== "string" || !validateFile(receipt).ok) throw new UploadError("Invalid upload confirmation.");
  const client = getR2Client(config);
  try {
    const result = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: receipt.key }));
    if (result.ContentLength !== receipt.size || result.ContentType !== receipt.type) {
      throw new UploadError("The stored file does not match the approved size or type. Its link has not been confirmed.", 409);
    }
    return publicObjectUrl(config.publicUrl, receipt.key);
  } catch (error) {
    if ((error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode === 404) {
      throw new UploadError("R2 has not received this file yet. Retry the upload.", 409);
    }
    throw error;
  } finally { client.destroy(); }
}

export async function uploadToR2(file: File, subdir?: string): Promise<string> {
  const validation = validateFile(file);
  if (!validation.ok) throw new UploadError(validation.error);
  const type = file.type.toLowerCase();
  const key = objectKey(type, subdir);
  return uploadBufferToR2(Buffer.from(await file.arrayBuffer()), type, key);
}
// Existing audio generation uses this trusted server-side buffer API.
export async function uploadBufferToR2(buffer: Buffer, contentType: string, key: string): Promise<string> {
  const config = configuration();
  const client = getR2Client(config);
  try {
    await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: buffer, ContentType: contentType, ContentLength: buffer.length }));
    return publicObjectUrl(config.publicUrl, key);
  } finally { client.destroy(); }
}

// Bound the stream itself as well as Content-Length, including requests without that header.
export async function readUploadBody(request: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    throw new UploadError("Request too large. Use direct upload from the Uploads page for larger files.", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new UploadError("Request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new UploadError("Request too large. Use direct upload from the Uploads page for larger files.", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
export async function readLegacyUpload(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) throw new UploadError("Expected a multipart file upload.", 415);
  const bytes = await readUploadBody(request, LEGACY_BODY_MAX_BYTES);
  let form: FormData;
  try { form = await new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type")! } }).formData(); }
  catch { throw new UploadError("Malformed upload form."); }
  const file = form.get("file");
  if (!file || typeof file === "string" || file.size === 0) throw new UploadError("No file provided.");
  const subdir = validateUploadSubdir(form.get("subdir") ?? undefined);
  return { file, subdir };
}


function allowsBrowserPut(rule: CORSRule, origin: string): boolean {
  return !!rule.AllowedOrigins?.some(value => value === origin || value === "*")
    && !!rule.AllowedMethods?.includes("PUT")
    && !!rule.AllowedHeaders?.some(value => value === "*" || value.toLowerCase() === "content-type");
}

/** Called only after authentication and Origin validation, using the request's Origin.
 * S3 replaces the complete CORS document: read first and preserve every existing rule.
 * No bucket policy or object permissions are changed. Never invoke this during tests
 * without mocking the S3 transport.
 */
export async function configureR2UploadCors(origin: string, configure = false) {
  // Defense in depth: accept only a serialized HTTP(S) origin, never a client-supplied body URL.
  let parsed: URL;
  try { parsed = new URL(origin); } catch { throw new UploadError("Invalid upload origin.", 403); }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin) throw new UploadError("Invalid upload origin.", 403);
  const config = configuration();
  const client = getR2Client(config);
  try {
    let rules: CORSRule[];
    try {
      const current = await client.send(new GetBucketCorsCommand({ Bucket: config.bucket }));
      rules = current.CORSRules ?? [];
    } catch (error) {
      // A missing CORS document is different from an unreadable bucket: never
      // overwrite an unknown configuration after AccessDenied or another failure.
      if ((error as { name?: string })?.name !== "NoSuchCORSConfiguration") throw error;
      rules = [];
    }
    if (rules.some(rule => allowsBrowserPut(rule, origin))) return { configured: true, changed: false, origin };
    if (!configure) return { configured: false, changed: false, origin };
    await client.send(new PutBucketCorsCommand({
      Bucket: config.bucket,
      CORSConfiguration: { CORSRules: [...rules, {
        AllowedOrigins: [origin], AllowedMethods: ["PUT"], AllowedHeaders: ["Content-Type"], MaxAgeSeconds: 3600,
      }] },
    }));
    // Read back rather than reporting success based solely on a configuration write.
    const verified = await client.send(new GetBucketCorsCommand({ Bucket: config.bucket }));
    if (!verified.CORSRules?.some(rule => allowsBrowserPut(rule, origin))) {
      throw new UploadError("The bucket CORS change could not be confirmed. Check setup again before uploading large files.", 502);
    }
    return { configured: true, changed: true, origin };
  } catch (error) {
    if (error instanceof UploadError) throw error;
    const details = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (details?.name === "AccessDenied" || details?.$metadata?.httpStatusCode === 403 || details?.$metadata?.httpStatusCode === 401) {
      throw new UploadError("Direct-upload setup needs bucket CORS permissions. These R2 credentials cannot read or update CORS. An administrator must configure CORS or supply credentials with bucket configuration permission. Small files can still use the server fallback; larger files require working CORS.", 503);
    }
    throw new UploadError("Bucket CORS setup could not be confirmed. Check storage configuration and retry. Small files can use the server fallback; larger files require working CORS.", 502);
  } finally { client.destroy(); }
}
