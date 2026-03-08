import dbConnect from "@/lib/db";
import Skill from "@/models/Skill";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Skills",
  description: "Kathan Desai's skills and technologies.",
};

export default async function SkillsPage() {
  const conn = await dbConnect();
  const items = conn ? await Skill.find().sort({ order: 1 }) : [];
  const byCategory = items.reduce<Record<string, { name: string; icon?: string }[]>>((acc, s) => {
    const cat = s.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ name: s.name, icon: s.icon });
    return acc;
  }, {});

  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Skills", url: "/skills" }]} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-12">Skills</h1>
        <div className="space-y-12">
          {Object.keys(byCategory).length === 0 ? (
            <p className="text-muted">No skills added yet.</p>
          ) : (
            Object.entries(byCategory).map(([category, skills]) => (
              <section key={category}>
                <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">{category}</h2>
                <div className="flex flex-wrap gap-3">
                  {skills.map((s) => (
                    <span
                      key={s.name}
                      className="px-4 py-2 bg-card rounded border border-border text-foreground font-mono text-sm"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}
