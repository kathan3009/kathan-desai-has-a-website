import dbConnect from "@/lib/db";
import Work from "@/models/Work";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Work",
  description: "Kathan Desai's work experience and roles.",
};

export default async function WorkPage() {
  const conn = await dbConnect();
  const items = conn ? await Work.find().sort({ order: 1 }) : [];

  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Work", url: "/work" }]} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <header className="mb-12">
          <p className="text-[10px] text-accent font-semibold uppercase tracking-[0.3em] mb-2">Experience</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Work</h1>
        </header>
        <div className="space-y-8">
          {items.length === 0 ? (
            <p className="text-muted">No work experience added yet.</p>
          ) : (
            items.map((item) => (
              <article key={item._id.toString()} className="border-b border-border pb-8 last:border-0">
                <p className="text-foreground font-semibold text-lg">{item.role}</p>
                <p className="text-accent">{item.company}</p>
                <p className="text-muted text-sm mt-1">{item.period}</p>
                {item.description && (
                  <p className="text-muted mt-4 leading-relaxed">{item.description}</p>
                )}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm mt-2 inline-block">
                    Visit →
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
