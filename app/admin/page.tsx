import Link from "next/link";
import { ADMIN_PATH } from "@/lib/adminPath";

const adminBase = `/${ADMIN_PATH}`;

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link href={`${adminBase}/about`} className="card p-4 hover:border-accent/50 transition-colors">
          <span className="text-foreground font-medium">About</span>
          <p className="text-muted text-sm mt-1">Manage About page Q&A</p>
        </Link>
        <Link href={`${adminBase}/work`} className="card p-4 hover:border-accent/50 transition-colors">
          <span className="text-foreground font-medium">Work</span>
          <p className="text-muted text-sm mt-1">Manage work experience</p>
        </Link>
        <Link href={`${adminBase}/projects`} className="card p-4 hover:border-accent/50 transition-colors">
          <span className="text-foreground font-medium">Projects</span>
          <p className="text-muted text-sm mt-1">Manage projects</p>
        </Link>
        <Link href={`${adminBase}/skills`} className="card p-4 hover:border-accent/50 transition-colors">
          <span className="text-foreground font-medium">Skills</span>
          <p className="text-muted text-sm mt-1">Manage skills</p>
        </Link>
        <Link href={`${adminBase}/blog`} className="card p-4 hover:border-accent/50 transition-colors">
          <span className="text-foreground font-medium">Blogs</span>
          <p className="text-muted text-sm mt-1">Manage blog posts</p>
        </Link>
        <Link href={`${adminBase}/certifications`} className="card p-4 hover:border-accent/50 transition-colors">
          <span className="text-foreground font-medium">Certifications</span>
          <p className="text-muted text-sm mt-1">Manage certifications</p>
        </Link>
        <Link href={`${adminBase}/faq`} className="card p-4 hover:border-accent/50 transition-colors">
          <span className="text-foreground font-medium">FAQ</span>
          <p className="text-muted text-sm mt-1">Manage FAQ entries</p>
        </Link>
        <Link href={`${adminBase}/photos`} className="card p-4 hover:border-accent/50 transition-colors">
          <span className="text-foreground font-medium">Photos</span>
          <p className="text-muted text-sm mt-1">Manage photography gallery</p>
        </Link>
        <Link href={`${adminBase}/uploads`} className="card p-4 hover:border-accent/50 transition-colors">
          <span className="text-foreground font-medium">Uploads</span>
          <p className="text-muted text-sm mt-1">Upload images/videos to R2</p>
        </Link>
      </div>
    </div>
  );
}
