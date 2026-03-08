import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const ALLOWED_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function sanitizeSubdir(subdir: string | undefined): string | undefined {
  if (!subdir?.trim()) return undefined;
  const cleaned = subdir.replace(/\.\./g, "").replace(/^\/+|\/+$/g, "").trim();
  if (!cleaned) return undefined;
  return cleaned;
}

export async function saveUpload(
  file: File,
  subdir?: string
): Promise<string> {
  const mime = file.type?.toLowerCase();
  if (!ALLOWED_MIMES.includes(mime)) {
    throw new Error("Invalid file type. Allowed: JPEG, PNG, GIF, WebP, AVIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File too large. Max size: 5MB.");
  }

  const safeSubdir = sanitizeSubdir(subdir);
  const dir = safeSubdir ? path.join(UPLOAD_DIR, safeSubdir) : UPLOAD_DIR;
  const resolvedDir = path.resolve(dir);
  if (!resolvedDir.startsWith(path.resolve(UPLOAD_DIR))) {
    throw new Error("Invalid upload path.");
  }
  await mkdir(resolvedDir, { recursive: true });

  const ext = path.extname(file.name)?.toLowerCase() || ".bin";
  const allowedExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];
  const safeExt = allowedExts.includes(ext) ? ext : ".bin";
  const filename = `${randomUUID()}${safeExt}`;
  const filepath = path.join(resolvedDir, filename);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filepath, buffer);

  const publicPath = safeSubdir ? `/uploads/${safeSubdir}/${filename}` : `/uploads/${filename}`;
  return publicPath;
}
