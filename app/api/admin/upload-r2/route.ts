import { adminJson, adminErrorResponse, AdminRequestError, requireAdminAuthentication, requireAdminOrigin } from "@/lib/adminRequest";
import { uploadToR2, readLegacyUpload, UploadError } from "@/lib/r2";

export const runtime = "nodejs";

// Backwards-compatible small-file endpoint. Larger files use upload-presign.
export async function POST(request: Request) {
  try {
    await requireAdminAuthentication();
    requireAdminOrigin(request);
    const { file, subdir } = await readLegacyUpload(request);
    return adminJson({ url: await uploadToR2(file, subdir) });
  } catch (error) {
    if (error instanceof AdminRequestError) return adminErrorResponse(error);
    if (error instanceof UploadError) return adminJson({ error: error.message }, error.status);
    return adminJson({ error: "R2 upload failed. Check storage configuration and permissions, then retry." }, 502);
  }
}
