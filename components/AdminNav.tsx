"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useRef, useState } from "react";
import { ADMIN_PATH } from "@/lib/adminPath";
import { adminRequest, errorMessage } from "@/components/admin/api";

const base = `/${ADMIN_PATH}`;
const sections = [["", "Overview"], ["blog", "Writing"], ["projects", "Projects"], ["photos", "Photographs"], ["about", "About"], ["work", "Work"], ["skills", "Skills"], ["certifications", "Certifications"], ["faq", "FAQ"], ["uploads", "Uploads"]];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  if (pathname === `${base}/login` || pathname === "/admin/login") return null;
  async function logout() {
    if (locked.current || !window.dispatchEvent(new Event("admin:before-leave", { cancelable: true }))) return;
    locked.current = true; setPending(true); setError("");
    try {
      await adminRequest("/api/admin/logout", { method: "POST" });
      router.push(`${base}/login`); router.refresh();
    } catch (error) { setError(errorMessage(error)); }
    finally { locked.current = false; setPending(false); }
  }
  return <aside className="admin-sidebar">
    <Link href={base} className="admin-brand">Studio<span>kathandesai.com</span></Link>
    <nav aria-label="Studio sections">{sections.map(([path, label]) => {
      const href = `${base}${path ? `/${path}` : ""}`;
      const active = pathname === href || pathname === `/admin${path ? `/${path}` : ""}`;
      return <Link key={path} href={href} aria-current={active ? "page" : undefined}>{label}</Link>;
    })}</nav>
    <div className="admin-sidebar-footer"><p>Website content</p><small>Saved changes update your site.</small><Link href="/" target="_blank" rel="noopener noreferrer">View site ↗</Link><button onClick={logout} disabled={pending}>{pending ? "Signing out…" : "Sign out"}</button>{error && <p role="alert" className="admin-error">{error}</p>}</div>
  </aside>;
}
