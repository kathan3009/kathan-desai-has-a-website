import Link from "next/link";
import { ADMIN_PATH } from "@/lib/adminPath";

const sections = [
  ["blog", "Writing", "Write and preview articles, manage media, and generate audio."],
  ["projects", "Projects", "Descriptions, technology stacks, and links to your work."],
  ["photos", "Photographs", "Captions, categories, and the order of your gallery."],
  ["about", "About", "The questions and answers that introduce you."],
  ["work", "Work", "Roles, companies, and your experience."],
  ["skills", "Skills", "Your tools, languages, and categories."],
  ["certifications", "Certifications", "Credentials, issuers, and verification links."],
  ["faq", "FAQ", "Clear answers to common questions."],
  ["uploads", "Uploads", "Upload images and videos, then copy their media URLs."],
];
export default function AdminDashboardPage() {
  return <section><header className="admin-heading"><div><h1>Your website, behind the scenes.</h1><p>Write something new, update your work, or give an existing page a little attention.</p></div></header>
    <div className="admin-overview">{sections.map(([path,title,description]) => <Link href={`/${ADMIN_PATH}/${path}`} key={path}><div><h2>{title}</h2><p>{description}</p></div><span aria-hidden="true">↗</span></Link>)}</div>
  </section>;
}
