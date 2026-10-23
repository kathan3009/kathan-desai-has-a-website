import { cache } from "react";
import { pageMetadata } from "@/lib/page-metadata";
import dbConnect from "@/lib/db";
import Skill from "@/models/Skill";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";
import SkillsConstellation from "@/components/SkillsConstellation";

export const dynamic = "force-dynamic";

const getItems = cache(async () => {
  const conn = await dbConnect();
  return conn ? await Skill.find().sort({ order: 1 }) : [];
});

export async function generateMetadata() {
  const items = await getItems();
  return pageMetadata({ title: "Skills", description: "The languages, tools, and technologies Kathan Desai works with.", path: "/skills", index: items.length > 0 });
}

export default async function SkillsPage() {
  const items = await getItems();
  const byCategory = items.reduce<Record<string, { name: string; icon?: string }[]>>((acc, s) => {
    const cat = s.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ name: s.name, icon: s.icon });
    return acc;
  }, {});

  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Skills", url: "/skills" }]} />
      <div className="page-shell public-info">
        <header>
          <p className="page-kicker">Toolkit</p>
          <h1>Skills</h1>
          <p className="page-description">What I reach for, grouped by the kind of problem.</p>
        </header>

        {Object.keys(byCategory).length === 0 ? (
          <p className="empty">No skills added yet.</p>
        ) : (
          <>
            <div className="mb-14 rounded-[28px] bg-surface p-4 sm:p-8">
              <p className="text-muted text-[14px] mb-2 text-center">Hover a category to explore</p>
              <SkillsConstellation byCategory={byCategory} />
            </div>

            <div className="space-y-10">
              {Object.entries(byCategory).map(([category, skills]) => (
                <section key={category} >
                  <h2 className="text-[14px] text-muted mb-3">{category}</h2>
                  <div className="chip-row">
                    {skills.map((s) => (
                      <span key={s.name} className="chip">{s.name}</span>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
