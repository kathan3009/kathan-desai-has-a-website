import { adminRequest } from "./api";

type PreparedUpload = { uploadUrl: string; token: string; headers: { "Content-Type": string }; expiresIn: number };
// Retain confirmation after a successful PUT so a failed confirmation/session expiry
// can be retried without uploading the same file a second time. Scoped to this page session.
const confirmations = new WeakMap<File, { token: string; subdir: string; expiresAt: number }>();
// Match the legacy endpoint's 4 MiB body limit, reserving 64 KiB for the form.
const FALLBACK_FILE_MAX_BYTES = 4 * 1024 * 1024 - 64 * 1024;
class DirectUploadError extends Error {}

export function putFile(file: File, prepared: PreparedUpload, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", prepared.uploadUrl);
    xhr.timeout = 10 * 60 * 1000;
    // No application cookies or auth headers are sent to R2.
    xhr.setRequestHeader("Content-Type", prepared.headers["Content-Type"]);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.min(100, Math.round(event.loaded / event.total * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new DirectUploadError(xhr.status === 403
        ? "R2 rejected the upload. Retry for a fresh upload link. If it keeps failing, check the bucket permissions and CORS settings."
        : `R2 returned status ${xhr.status}. The upload was not confirmed; please retry.`));
    };
    xhr.onerror = () => reject(new DirectUploadError("Could not reach R2. Check your connection and retry. If this persists, the bucket must allow PUT with Content-Type from this site's exact origin in its CORS settings."));
    xhr.ontimeout = () => reject(new Error("The upload timed out. Check your connection and retry."));
    xhr.onabort = () => reject(new Error("The upload was interrupted. Retry when ready."));
    xhr.send(file);
  });
}

export async function uploadFileDirect(file: File, subdir: string, onProgress: (message: string) => void): Promise<string> {
  const folder = subdir.trim();
  let pending = confirmations.get(file);
  if (pending && (pending.subdir !== folder || pending.expiresAt <= Date.now())) { confirmations.delete(file); pending = undefined; }
  if (!pending) {
    onProgress("Preparing upload…");
    const prepared = await adminRequest<PreparedUpload>("/api/admin/upload-presign", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "prepare", type: file.type, size: file.size, subdir: folder }),
    });
    if (!prepared.uploadUrl || !prepared.token || !prepared.headers?.["Content-Type"]) throw new Error("The server returned incomplete upload details. Please retry.");
    try {
      await putFile(file, prepared, percent => onProgress(`Uploading ${percent}%`));
    } catch (error) {
      if (!(error instanceof DirectUploadError)) throw error;
      if (file.size > FALLBACK_FILE_MAX_BYTES) {
        throw new Error(`${error.message} This file is too large for the server fallback; direct R2 upload and bucket CORS must work before it can be uploaded.`);
      }
      onProgress("Trying the small-file upload fallback…");
      const body = new FormData();
      body.append("file", file);
      if (folder) body.append("subdir", folder);
      const fallback = await adminRequest<{ url?: string }>("/api/admin/upload-r2", { method: "POST", body });
      if (!fallback.url) throw new Error("The small-file upload was not confirmed. Please retry.");
      return fallback.url;
    }
    pending = { token: prepared.token, subdir: folder, expiresAt: Date.now() + 55 * 60 * 1000 };
    confirmations.set(file, pending);
  }
  onProgress("Confirming upload…");
  const data = await adminRequest<{ url?: string }>("/api/admin/upload-presign", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "complete", token: pending.token }),
  });
  if (!data.url) throw new Error("The upload could not be confirmed. Retry to check it again.");
  confirmations.delete(file);
  return data.url;
}
