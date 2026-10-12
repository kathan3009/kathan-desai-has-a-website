// A plain-text map of the site for language models, in the llms.txt convention:
// who this is, what is here, and where each thing lives.
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import Project from "@/models/Project";
import { plainText } from "@/lib/seo";
import { orderPublicProjects } from "@/lib/projects";
import { AUTHOR, SITE_URL } from "@/lib/site";
import { STATIC_POSTS } from "@/lib/static-posts";

export const dynamic = "force-dynamic";

export async function GET() {
  const posts: string[] = STATIC_POSTS.map((post) => `- [${post.title}](${SITE_URL}/blogs/${post.slug}): ${post.excerpt}`);
  const projects: string[] = [];
  try {
    const conn = await dbConnect();
    if (conn) {
      const staticSlugs = new Set(STATIC_POSTS.map((post) => post.slug));
      const [dbPosts, dbProjects] = await Promise.all([
        Blog.find({ isDraft: { $ne: true } }).select("title slug excerpt content").sort({ publishedAt: -1 }).lean(),
        Project.find().sort({ order: 1 }).select("name description liveUrl repoUrl").lean(),
      ]);
      for (const post of dbPosts) if (!staticSlugs.has(String(post.slug))) posts.push(`- [${post.title}](${SITE_URL}/blogs/${encodeURIComponent(String(post.slug))}): ${String(post.excerpt || "") || plainText(String(post.content || ""), 200)}`);
      for (const project of orderPublicProjects(dbProjects.map((p) => ({ name: String(p.name), id: String(p._id), description: String(p.description || ""), liveUrl: String(p.liveUrl || ""), repoUrl: String(p.repoUrl || "") })))) {
        const links = [project.liveUrl && `live: ${project.liveUrl}`, project.repoUrl && `source: ${project.repoUrl}`].filter(Boolean).join(", ");
        projects.push(`- [${project.name}](${SITE_URL}/projects/${project.id}): ${plainText(project.description, 200)}${links ? ` (${links})` : ""}`);
      }
    }
  } catch {
    // The site map below is still correct without the database.
  }
  const body = `# Kathan Desai

> Kathan Desai is the founder of BugBase (https://bugbase.in), a security company started in 2021 that runs bug bounty and security programs. He lives in San Francisco, where he is building Pentest Copilot Enterprise, an AI system for penetration testing. He is from New Delhi. This site holds his projects, essays and photographs.

Contact: ${AUTHOR.email}. Elsewhere: ${AUTHOR.sameAs.join(", ")}.

## Pages

- [Home](${SITE_URL}/): introduction, current product, latest writing and photographs
- [About](${SITE_URL}/about): the short story of BugBase and the move to San Francisco
- [Projects](${SITE_URL}/projects): the company, the product, and smaller experiments and tools
- [Writing](${SITE_URL}/blogs): build notes and essays, mostly on offensive security and AI agents
- [Photography](${SITE_URL}/photography): photographs from the Himalaya and San Francisco
- [Photoshop MCP](${SITE_URL}/photoshop-mcp): a free macOS app that lets an AI agent work inside Photoshop
- [Now](${SITE_URL}/now): what he is doing at the moment
- [Work](${SITE_URL}/work), [Skills](${SITE_URL}/skills), [Certifications](${SITE_URL}/certifications), [FAQ](${SITE_URL}/faq)
- [RSS feed](${SITE_URL}/feed.xml)

## Writing

${posts.join("\n") || "- Writing is temporarily unavailable."}

## Projects

${projects.join("\n") || "- Projects are temporarily unavailable."}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
