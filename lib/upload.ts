import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function saveUpload(
  file: File,
  subdir?: string
): Promise<string> {
  const dir = subdir ? path.join(UPLOAD_DIR, subdir) : UPLOAD_DIR;
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || ".bin";
  const filename = `${randomUUID()}${ext}`;
  const filepath = path.join(dir, filename);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filepath, buffer);

  const publicPath = subdir ? `/uploads/${subdir}/${filename}` : `/uploads/${filename}`;
  return publicPath;
}
