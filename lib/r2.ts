import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// Limits: 5MB for images, 25MB for videos
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 25 * 1024 * 1024;

export const IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
];

export const VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
];

const ALLOWED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

export type MediaType = "image" | "video";

export function getMediaType(mime: string): MediaType | null {
  if (IMAGE_TYPES.includes(mime)) return "image";
  if (VIDEO_TYPES.includes(mime)) return "video";
  return null;
}

export function getMaxBytes(mime: string): number | null {
  const type = getMediaType(mime);
  if (type === "image") return IMAGE_MAX_BYTES;
  if (type === "video") return VIDEO_MAX_BYTES;
  return null;
}

export function validateFile(file: File): { ok: true } | { ok: false; error: string } {
  const mime = file.type?.toLowerCase();
  const mediaType = getMediaType(mime);

  if (!mediaType) {
    return {
      ok: false,
      error: `Invalid file type. Allowed: images (JPEG, PNG, GIF, WebP, AVIF) and videos (MP4, WebM, MOV).`,
    };
  }

  const maxBytes = getMaxBytes(mime)!;
  if (file.size > maxBytes) {
    const maxMB = maxBytes / (1024 * 1024);
    return {
      ok: false,
      error: `File too large. Max size for ${mediaType}s: ${maxMB}MB.`,
    };
  }

  return { ok: true };
}

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function sanitizeSubdir(subdir: string | undefined): string | undefined {
  if (!subdir?.trim()) return undefined;
  const cleaned = subdir.replace(/\.\./g, "").replace(/^\/+|\/+$/g, "").trim();
  if (!cleaned) return undefined;
  return cleaned;
}

export async function uploadToR2(
  file: File,
  subdir?: string
): Promise<string> {
  const validation = validateFile(file);
  if (!validation.ok) throw new Error(validation.error);

  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucket || !publicUrl) {
    throw new Error("R2_BUCKET_NAME and R2_PUBLIC_URL must be set.");
  }

  const safeSubdir = sanitizeSubdir(subdir);
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const key = safeSubdir ? `${safeSubdir}/${randomUUID()}.${ext}` : `${randomUUID()}.${ext}`;

  const client = getR2Client();
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    })
  );

  const base = publicUrl.replace(/\/$/, "");
  return `${base}/${key}`;
}
