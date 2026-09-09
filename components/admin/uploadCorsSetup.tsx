"use client";

import { useRef, useState } from "react";
import { adminRequest, errorMessage } from "./api";
import { Feedback } from "./Feedback";

type CorsResult = { configured: boolean; changed: boolean; origin: string };

export function UploadCorsSetup({ disabled }: { disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const locked = useRef(false);
  async function setup(configure: boolean) {
    if (locked.current || disabled) return;
    locked.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const result = await adminRequest<CorsResult>("/api/admin/upload-presign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: configure ? "cors-configure" : "cors-status" }),
      });
      setNotice(result.configured
        ? `The bucket allows direct uploads from ${result.origin}.${result.changed ? " The setup rule was added alongside existing rules." : " No setup change was needed."} Try uploading a file to verify the connection.`
        : `The bucket needs upload setup for ${result.origin}. Choose “Enable direct uploads for this site”. Until setup is complete, only files under 3.9 MB can use the server fallback.`);
    } catch (error) { setError(errorMessage(error)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <div className="admin-record">
    <div style={{ width: "100%" }}>
      <h2>Upload setup</h2>
      <p className="admin-muted">If larger uploads fail, check that the storage bucket allows uploads from this site.</p>
      <Feedback error={error} notice={notice} />
      <div className="admin-actions">
        <button type="button" className="admin-button-secondary" disabled={disabled || busy} onClick={() => setup(false)}>{busy ? "Checking setup…" : "Check upload setup"}</button>
        <button type="button" className="admin-button-secondary" disabled={disabled || busy} onClick={() => setup(true)}>Enable direct uploads for this site</button>
      </div>
    </div>
  </div>;
}
