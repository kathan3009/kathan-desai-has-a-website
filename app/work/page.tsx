import { pageMetadata } from "@/lib/page-metadata";
import dbConnect from "@/lib/db";
import Work from "@/models/Work";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({"title": "Work", "description": "Kathan Desai’s roles at BugBase, Pentest Copilot, and the ACM student chapter.", "path": "/work"});

export default async function WorkPage() {
  const conn = await dbConnect();
  const items = conn ? await Work.find().sort({ order: 1 }) : [];

  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Work", url: "/work" }]} />
      <div className="page-shell public-info">
        <header>
          <p className="page-kicker">Experience</p>
          <h1>Work</h1>
          <p className="page-description">The roles that shaped how I build, most recent first.</p>
        </header>
        <div>
          {items.length === 0 ? (
            <p className="empty">No work experience added yet.</p>
          ) : (
            items.map((item) => (
              <article key={item._id.toString()} className="info-row">
                <div className="info-grid">
                  <div>
                    <p className="text-foreground font-semibold text-[21px] tracking-[-0.02em] leading-tight">{item.role}</p>
                    <p className="text-muted mt-1">{item.company}</p>
                  </div>
                  <p className="text-muted text-[15px] sm:text-right">{item.period}</p>
                </div>
                {item.description && (
                  <p className="text-muted mt-4 max-w-[640px]">{item.description}</p>
                )}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-link mt-3">
                    Visit <span aria-hidden>↗</span>
                  </a>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </>
  );
}
