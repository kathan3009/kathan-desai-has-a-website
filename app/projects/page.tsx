import Link from "next/link";
import dbConnect from "@/lib/db";
import Project from "@/models/Project";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";
import { ProjectCard } from "@/components/ProjectCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Projects",
  description: "Kathan Desai's projects including Python and web development work.",
};

export default async function ProjectsPage() {
  const conn = await dbConnect();
  const items = conn ? await Project.find().sort({ order: 1 }) : [];
  const pyProjects = items.filter((p) => p.type === "py");
  const otherProjects = items.filter((p) => p.type !== "py");

  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Projects", url: "/projects" }]} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <header className="mb-12">
          <p className="text-[10px] text-accent font-semibold uppercase tracking-[0.3em] mb-2">What I build</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Projects</h1>
        </header>

        {pyProjects.length > 0 && (
          <section className="mb-16">
            <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-6">Python</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {pyProjects.map((item) => (
                <ProjectCard key={item._id.toString()} item={item} />
              ))}
            </div>
          </section>
        )}

        <section>
            <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-6">
            {pyProjects.length > 0 ? "Other" : "All Projects"}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {otherProjects.length === 0 && pyProjects.length === 0 ? (
              <p className="text-muted col-span-2">No projects added yet.</p>
            ) : (
              otherProjects.map((item) => (
                <ProjectCard key={item._id.toString()} item={item} />
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}

