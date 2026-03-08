import Link from "next/link";
import dbConnect from "@/lib/db";
import { ProjectCard } from "@/components/ProjectCard";
import Work from "@/models/Work";
import Project from "@/models/Project";
import Blog from "@/models/Blog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const conn = await dbConnect();
  const [work, projects, blogPosts] = conn
    ? await Promise.all([
        Work.find().sort({ order: 1 }).limit(3),
        Project.find().sort({ order: 1 }).limit(4),
        Blog.find().sort({ publishedAt: -1 }).limit(3),
      ])
    : [[], [], []];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
      <section className="mb-16 sm:mb-24">
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tight">
          Hi, I'm Kathan.
        </h1>
        <p className="text-muted max-w-2xl leading-relaxed mb-4">
          I'm an entrepreneur and builder focused on AI for security. I dropped out at 20 to co-found{" "}
          <a
            href="https://bugbase.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            BugBase
          </a>
          , a bug bounty platform, and I'm now building{" "}
          <a
            href="https://copilot.bugbase.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Pentest Copilot
          </a>{" "}
          — an AI agent for autonomous pentesting. Outside of work, I write, build side projects, and shoot photography.
        </p>
        <p className="text-muted max-w-2xl leading-relaxed">
          Currently based in San Francisco and New Delhi.
        </p>
      </section>

      <section className="mb-16 sm:mb-24">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-6">Work</h2>
        <div className="space-y-6">
          {work.length === 0 ? (
            <p className="text-muted">No work experience added yet.</p>
          ) : (
            work.map((item) => (
              <div key={item._id.toString()} className="group">
                <p className="text-foreground font-medium group-hover:text-accent transition-colors">
                  {item.role} at {item.company}
                </p>
                <p className="text-muted text-sm">{item.period}</p>
              </div>
            ))
          )}
        </div>
        <Link href="/work" className="inline-block mt-6 text-accent hover:underline text-sm font-medium">
          View all work →
        </Link>
      </section>

      <section className="mb-16 sm:mb-24">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-6">Projects</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {projects.length === 0 ? (
            <p className="text-muted col-span-2">No projects added yet.</p>
          ) : (
            projects.map((item) => (
              <ProjectCard key={item._id.toString()} item={item} />
            ))
          )}
        </div>
        <Link href="/projects" className="inline-block mt-6 text-accent hover:underline text-sm font-medium">
          View all projects →
        </Link>
      </section>

      <section className="mb-16 sm:mb-24">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-6">Blogs</h2>
        <div className="space-y-6">
          {blogPosts.length === 0 ? (
            <p className="text-muted">No posts yet.</p>
          ) : (
            blogPosts.map((post) => (
              <Link
                key={post._id.toString()}
                href={`/blogs/${post.slug}`}
                className="block group"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-foreground font-medium group-hover:text-accent transition-colors line-clamp-1">
                      {post.title}
                    </h3>
                    <p className="text-muted text-sm mt-0.5">
                      {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {post.excerpt && (
                      <p className="text-muted text-sm mt-1 line-clamp-2">{post.excerpt}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        <Link href="/blogs" className="inline-block mt-6 text-accent hover:underline text-sm font-medium">
          View all posts →
        </Link>
      </section>

      <section className="mb-16 sm:mb-24">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-6">Photography</h2>
        <p className="text-muted max-w-xl mb-6">
          Moments captured through the lens — a visual journal.
        </p>
        <Link href="/photography" className="inline-flex items-center gap-2 text-accent hover:underline font-medium">
          View gallery →
        </Link>
      </section>
    </div>
  );
}
