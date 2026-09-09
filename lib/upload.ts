import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { validateFile, validateUploadSubdir, UploadError } from "./r2";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const ALLOWED_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
];
export async function saveUpload(
  file: File,
  subdir?: string
): Promise<string> {
  const mime = file.type?.toLowerCase();
  if (!ALLOWED_MIMES.includes(mime)) {
    throw new UploadError("Invalid file type. Allowed: JPEG, PNG, GIF, WebP, AVIF.");
  }
  const validation = validateFile(file);
  if (!validation.ok) throw new UploadError(validation.error);

  const safeSubdir = validateUploadSubdir(subdir);
  const dir = safeSubdir ? path.join(UPLOAD_DIR, safeSubdir) : UPLOAD_DIR;
  const resolvedDir = path.resolve(dir);
  if (resolvedDir !== path.resolve(UPLOAD_DIR) && !resolvedDir.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
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
