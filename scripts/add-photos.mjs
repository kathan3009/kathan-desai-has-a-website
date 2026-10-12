// Add photographs to the gallery from the command line.
//
//   node --env-file=.env.vercel-production.local scripts/add-photos.mjs <folder> [--prepend] [--dry-run]
//
// <folder> holds the images plus a manifest.json: [{file, caption, category, order}].
// Each image is resized to a 2400px long edge, converted to sRGB JPEG, uploaded to
// R2 under photos/<uuid>.jpg and recorded in MongoDB exactly as the admin form would.
// --prepend moves every existing photo down so the new set comes first.
// --dry-run resizes and prints the plan without uploading or writing.
import { readFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import mongoose from "mongoose";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const args = process.argv.slice(2);
const folder = args.find((a) => !a.startsWith("--"));
const prepend = args.includes("--prepend");
const dryRun = args.includes("--dry-run");
if (!folder) { console.error("Usage: node --env-file=.env.vercel-production.local scripts/add-photos.mjs <folder> [--prepend] [--dry-run]"); process.exit(1); }

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL, MONGODB_URI } = process.env;
if (!dryRun && (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL || !MONGODB_URI)) {
  console.error("Missing env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL and MONGODB_URI are all required."); process.exit(1);
}

const manifest = JSON.parse(await readFile(join(folder, "manifest.json"), "utf8"));
const outDir = resolve(folder, "web");
await mkdir(outDir, { recursive: true });
const MAX_BYTES = 5 * 1024 * 1024;

const prepared = [];
for (const entry of manifest) {
  const source = resolve(folder, entry.file);
  let quality = 86, buffer;
  do {
    buffer = await sharp(source).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).toColorspace("srgb").jpeg({ quality, mozjpeg: true }).toBuffer();
    quality -= 6;
  } while (buffer.length > MAX_BYTES && quality > 50);
  const meta = await sharp(buffer).metadata();
  prepared.push({ ...entry, buffer, width: meta.width, height: meta.height });
  console.log(`${entry.file}: ${meta.width}x${meta.height}, ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}
if (dryRun) { console.log(`Dry run: ${prepared.length} photos ready, nothing uploaded.`); process.exit(0); }

const s3 = new S3Client({ region: "auto", endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY } });
await mongoose.connect(MONGODB_URI);
const Photo = mongoose.models.Photo || mongoose.model("Photo", new mongoose.Schema({ image: { type: String, required: true }, caption: { type: String, default: "" }, category: { type: String, default: "" }, order: { type: Number, default: 0 } }, { timestamps: true }));

if (prepend) {
  const shift = Math.max(...prepared.map((p) => p.order)) + 1;
  const result = await Photo.updateMany({}, { $inc: { order: shift } });
  console.log(`Moved ${result.modifiedCount} existing photos down by ${shift}.`);
}
for (const photo of prepared) {
  const key = `photos/${randomUUID()}.jpg`;
  await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: photo.buffer, ContentType: "image/jpeg", CacheControl: "public, max-age=31536000, immutable" }));
  const image = `${R2_PUBLIC_URL.replace(/\/+$/, "")}/${key}`;
  const doc = await Photo.create({ image, caption: photo.caption, category: photo.category, order: photo.order });
  console.log(`Added ${doc._id}: ${photo.caption} -> ${image}`);
}
await mongoose.disconnect();
console.log("Done.");
