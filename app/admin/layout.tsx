import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import AdminNav from "@/components/AdminNav";
import "./admin.css";

export const metadata = { title: "Studio", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-shell">
    <a className="admin-skip-link" href="#admin-content">Skip to content</a>
    <AdminNav />
    <div id="admin-content" className="admin-main" tabIndex={-1}>{children}</div>
  </div>;
}
