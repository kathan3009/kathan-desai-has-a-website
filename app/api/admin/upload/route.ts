import { adminJson, adminErrorResponse, AdminRequestError, requireAdminAuthentication, requireAdminOrigin } from "@/lib/adminRequest";
import { saveUpload } from "@/lib/upload";
import { getMediaType, readLegacyUpload, uploadToR2, UploadError } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdminAuthentication();
    requireAdminOrigin(request);
    const { file, subdir } = await readLegacyUpload(request);
    if (getMediaType(file.type.toLowerCase()) !== "image") throw new UploadError("Choose a JPEG, PNG, GIF, WebP or AVIF image.");
    // Vercel's filesystem is ephemeral/read-only. Retain the existing { path } contract.
    const path = process.env.VERCEL ? await uploadToR2(file, subdir) : await saveUpload(file, subdir);
    return adminJson({ path });
  } catch (error) {
    if (error instanceof AdminRequestError) return adminErrorResponse(error);
    if (error instanceof UploadError) return adminJson({ error: error.message }, error.status);
    return adminJson({ error: "Upload failed. Check storage configuration and permissions, then retry." }, 502);
  }
}
