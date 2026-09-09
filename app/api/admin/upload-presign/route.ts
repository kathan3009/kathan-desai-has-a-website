import { adminJson, adminErrorResponse, AdminRequestError, requireAdminAuthentication, requireAdminOrigin } from "@/lib/adminRequest";
import { prepareR2Upload, finalizeR2Upload, configureR2UploadCors, readUploadBody, UploadError } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdminAuthentication();
    requireAdminOrigin(request);
    if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
      throw new UploadError("Expected JSON upload details.", 415);
    }
    const bytes = await readUploadBody(request, 8192);
    let body: Record<string, unknown>;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { throw new UploadError("Invalid JSON upload details."); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new UploadError("Expected upload details.");
    if (body.action === "cors-status" || body.action === "cors-configure") {
      // The shared guard already approved this exact Origin. Ignore all body-supplied origins.
      return adminJson(await configureR2UploadCors(request.headers.get("origin")!, body.action === "cors-configure"));
    }
    if (body.action === "complete") return adminJson({ url: await finalizeR2Upload(body.token) });
    if (body.action !== "prepare") throw new UploadError("Invalid upload action.");
    return adminJson(await prepareR2Upload(body));
  } catch (error) {
    if (error instanceof AdminRequestError) return adminErrorResponse(error);
    if (error instanceof UploadError) return adminJson({ error: error.message }, error.status);
    // Never leak provider responses, credentials, or signed URLs into errors/logs.
    return adminJson({ error: "R2 could not authorize or confirm the upload. Check storage configuration and permissions, then retry." }, 502);
  }
}
