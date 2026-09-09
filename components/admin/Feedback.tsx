import Link from "next/link";
import { ADMIN_PATH } from "@/lib/adminPath";

export function Feedback({ error, notice }: { error?: string; notice?: string }) {
  return <div className="admin-feedback">
    {notice && <p role="status" className="admin-success">{notice}</p>}
    {error && <div role="alert" className="admin-error">{error}{error.includes("session has expired") && <> <Link href={`/${ADMIN_PATH}/login`} target="_blank" rel="noopener noreferrer">Sign in in a new tab</Link>.</>}</div>}
  </div>;
}
