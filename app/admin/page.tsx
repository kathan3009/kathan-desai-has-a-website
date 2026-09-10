import Link from "next/link";
import dbConnect from "@/lib/db";
import { ADMIN_PATH } from "@/lib/adminPath";
import Blog from "@/models/Blog";
import Project from "@/models/Project";
import Photo from "@/models/Photo";

export const dynamic = "force-dynamic";

type RecentEdit = {
  id: string;
  title: string;
  kind: "Writing" | "Project" | "Photograph";
  path: string;
  updatedAt: Date;
  draft?: boolean;
};

function recordDate(...values: unknown[]) {
  for (const value of values) {
    const date = new Date(String(value ?? ""));
    if (Number.isFinite(date.getTime())) return date;
  }
  return new Date(0);
}

export default async function AdminDashboardPage() {
  const conn = await dbConnect();
  let liveArticles = 0;
  let drafts = 0;
  let projectCount = 0;
  let photoCount = 0;
  let recent: RecentEdit[] = [];

  if (conn) {
    const [live, draft, projects, photos, recentBlogs, recentProjects, recentPhotos] = await Promise.all([
      Blog.countDocuments({ isDraft: { $ne: true } }),
      Blog.countDocuments({ isDraft: true }),
      Project.countDocuments(),
      Photo.countDocuments(),
      Blog.find().sort({ updatedAt: -1 }).limit(4).select("title updatedAt createdAt publishedAt isDraft").lean(),
      Project.find().sort({ updatedAt: -1 }).limit(4).select("name updatedAt createdAt publishedAt").lean(),
      Photo.find().sort({ updatedAt: -1 }).limit(4).select("caption updatedAt createdAt").lean(),
    ]);
    liveArticles = live;
    drafts = draft;
    projectCount = projects;
    photoCount = photos;
    recent = [
      ...recentBlogs.map(item => ({ id: String(item._id), title: String(item.title), kind: "Writing" as const, path: "blog", updatedAt: recordDate(item.updatedAt, item.createdAt, item.publishedAt), draft: Boolean(item.isDraft) })),
      ...recentProjects.map(item => ({ id: String(item._id), title: String(item.name), kind: "Project" as const, path: "projects", updatedAt: recordDate(item.updatedAt, item.createdAt, item.publishedAt) })),
      ...recentPhotos.map(item => ({ id: String(item._id), title: String(item.caption || "Untitled photograph"), kind: "Photograph" as const, path: "photos", updatedAt: recordDate(item.updatedAt, item.createdAt) })),
    ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 6);
  }

  const storageReady = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"].every(key => Boolean(process.env[key]));
  const metrics = [
    [String(liveArticles), "Live articles"],
    [String(drafts), "Drafts"],
    [String(projectCount), "Projects"],
    [String(photoCount), "Photographs"],
  ];
  const actions = [
    ["blog#editor", "Write", "Start an article"],
    ["projects#editor", "Project", "Add something built"],
    ["photos#editor", "Photograph", "Add to a visual story"],
    ["uploads", "Upload", "Prepare media"],
  ];

  return (
    <section>
      <header className="admin-heading admin-dashboard-heading">
        <div>
          <p className="admin-eyebrow">Studio</p>
          <h1>Your site at a glance.</h1>
          <p>Create something, return to a draft, or check the latest changes.</p>
        </div>
        <div className={`admin-storage ${storageReady ? "is-ready" : ""}`}>
          <span aria-hidden="true" />
          Media uploads {storageReady ? "ready" : "need setup"}
        </div>
      </header>

      <div className="admin-create-grid" aria-label="Create content">
        {actions.map(([path, title, description]) => (
          <Link href={`/${ADMIN_PATH}/${path}`} key={path}>
            <span>+</span>
            <div><strong>{title}</strong><small>{description}</small></div>
          </Link>
        ))}
      </div>

      <div className="admin-metrics" aria-label="Content totals">
        {metrics.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </div>

      <section className="admin-recent" aria-labelledby="recent-edits-heading">
        <div className="admin-list-heading">
          <h2 id="recent-edits-heading">Recent edits</h2>
          <Link className="admin-text-button" href="/" target="_blank" rel="noopener noreferrer">View site ↗</Link>
        </div>
        {!conn && <p className="admin-empty">The content database is unavailable.</p>}
        {conn && recent.length === 0 && <p className="admin-empty">Your latest edits will appear here.</p>}
        <div className="admin-recent-list">
          {recent.map(item => (
            <Link href={`/${ADMIN_PATH}/${item.path}`} key={`${item.kind}-${item.id}`}>
              <div><span>{item.kind}{item.draft ? " · Draft" : ""}</span><strong>{item.title}</strong></div>
              <time dateTime={item.updatedAt.toISOString()}>{item.updatedAt.getTime() === 0 ? "Earlier" : item.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
