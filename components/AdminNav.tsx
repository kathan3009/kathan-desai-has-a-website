"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ADMIN_PATH } from "@/lib/adminPath";

const adminBase = `/${ADMIN_PATH}`;

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === `${adminBase}/login`) return null;

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push(`${adminBase}/login`);
    router.refresh();
  }

  return (
    <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
      <div className="flex gap-6">
        <Link href={adminBase} className="text-foreground font-medium hover:text-accent transition-colors">
          Dashboard
        </Link>
        <Link href={`${adminBase}/about`} className="text-muted hover:text-accent transition-colors">About</Link>
        <Link href={`${adminBase}/work`} className="text-muted hover:text-accent transition-colors">Work</Link>
        <Link href={`${adminBase}/projects`} className="text-muted hover:text-accent transition-colors">Projects</Link>
        <Link href={`${adminBase}/skills`} className="text-muted hover:text-accent transition-colors">Skills</Link>
        <Link href={`${adminBase}/blog`} className="text-muted hover:text-accent transition-colors">Blogs</Link>
        <Link href={`${adminBase}/certifications`} className="text-muted hover:text-accent transition-colors">Certs</Link>
        <Link href={`${adminBase}/faq`} className="text-muted hover:text-accent transition-colors">FAQ</Link>
        <Link href={`${adminBase}/photos`} className="text-muted hover:text-accent transition-colors">Photos</Link>
        <Link href={`${adminBase}/uploads`} className="text-muted hover:text-accent transition-colors">Uploads</Link>
      </div>
      <div className="flex gap-4">
        <Link href="/" className="text-muted hover:text-accent text-sm transition-colors">View Site</Link>
        <button onClick={handleLogout} className="text-muted hover:text-accent text-sm transition-colors">
          Logout
        </button>
      </div>
    </nav>
  );
}
