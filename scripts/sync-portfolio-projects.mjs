import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import mongoose from "mongoose";
import { portfolioArticles } from "./portfolio-content.mjs";

const enabledOnly = process.argv.includes("--if-enabled");
if (enabledOnly && process.env.PORTFOLIO_SYNC !== "1") {
  console.log("Portfolio sync skipped. Set PORTFOLIO_SYNC=1 to enable it during a build.");
  process.exit(0);
}

const requiredEnv = [
  "MONGODB_URI",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
];

const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(", ")}`);
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const assetDir = join(currentDir, "project-assets");
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://kathandesai.com").replace(/\/$/, "");
const r2BaseUrl = process.env.R2_PUBLIC_URL.replace(/\/$/, "");
const syncedAt = new Date("2026-08-10T18:00:00+05:30");
const slugs = [
  "sentinel",
  "videomemory",
  "video-studio",
  "swanlink",
  "inde",
  "pentest-copilot-oss",
  "pentest-copilot-enterprise",
];

const assets = [
  ...slugs.map((id) => ({
    id,
    file: `${id}.png`,
    key: `portfolio/projects/2026/covers/${id}.png`,
  })),
  ...slugs.map((id) => ({
    id: `${id}-logo`,
    file: `logos/${id}.png`,
    key: `portfolio/projects/2026/logos-v2/${id}.png`,
  })),
  ...slugs.map((id) => ({
    id: `${id}-poster`,
    file: `posters/${id}.jpg`,
    key: `portfolio/projects/2026/brag-stories/posters/${id}.jpg`,
  })),
  ...slugs.map((id) => ({
    id: `${id}-video`,
    file: `videos/${id}.mp4`,
    key: `portfolio/projects/2026/brag-stories/${id}.mp4`,
  })),
];

function contentTypeFor(filename) {
  const extension = extname(filename).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".mp4") return "video/mp4";
  throw new Error(`Unsupported project asset type: ${extension}`);
}

async function uploadAssets() {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const urls = {};
  for (const asset of assets) {
    const body = await readFile(join(assetDir, asset.file));
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: asset.key,
        Body: body,
        ContentType: contentTypeFor(asset.file),
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    urls[asset.id] = `${r2BaseUrl}/${asset.key}`;
  }
  return urls;
}

function projectRecords(imageUrls) {
  return [
    {
      name: "Sentinel Browser Runtime",
      description: "A semantic browser and mobile runtime that lets AI agents target stable controls, respect policy boundaries, and verify that an intended outcome actually occurred.",
      techStack: ["TypeScript", "Playwright", "MCP", "Appium", "Chromium", "Zod"],
      repoUrl: "",
      liveUrl: `${siteUrl}/blogs/building-sentinel-semantic-browser-runtime`,
      image: imageUrls["sentinel-logo"],
      type: "other",
      status: "in-development",
      publishedAt: new Date("2026-05-14T01:59:40Z"),
      order: -70,
    },
    {
      name: "VideoMemory",
      description: "A local, MCP-native temporal memory layer that finds the useful moment in a long video and returns the timestamp, transcript context, and query-selected frames.",
      techStack: ["Python", "MCP", "SQLite", "faster-whisper", "MobileCLIP", "ffmpeg"],
      repoUrl: "https://github.com/kathan3009/videomemory",
      liveUrl: `${siteUrl}/blogs/videomemory-searchable-memory-for-ai-agents`,
      image: imageUrls["videomemory-logo"],
      type: "py",
      status: "beta",
      publishedAt: new Date("2026-05-17T16:57:08Z"),
      order: -69,
    },
    {
      name: "Video Studio",
      description: "A local-first production workflow that helps coding agents turn a brief or rough capture into a scripted, edited, captioned, checked, and publishable video.",
      techStack: ["Python", "ffmpeg", "Playwright", "faster-whisper", "OpenAI", "Pillow"],
      repoUrl: "https://github.com/kathan3009/video-studio",
      liveUrl: `${siteUrl}/blogs/video-studio-agentic-video-production-pipeline`,
      image: imageUrls["video-studio-logo"],
      type: "py",
      status: "active",
      publishedAt: new Date("2026-05-19T12:57:20Z"),
      order: -68,
    },
    {
      name: "Swanlink",
      description: "A deterministic coordination fabric that gives heterogeneous AI agents visible task ownership, acknowledgements, leases, handoffs, recovery, and telemetry.",
      techStack: ["TypeScript", "MCP", "Cloudflare Workers", "Durable Objects", "D1", "Vitest"],
      repoUrl: "",
      liveUrl: `${siteUrl}/blogs/swanlink-coordination-fabric-for-ai-agents`,
      image: imageUrls["swanlink-logo"],
      type: "other",
      status: "prototype",
      publishedAt: new Date("2026-05-18T20:52:13Z"),
      order: -67,
    },
    {
      name: "Inde",
      description: "A luxury-fashion concept that carries Indian craft context from editorial discovery through contemporary silhouettes and a made-to-order consultation experience.",
      techStack: ["Next.js", "React", "TypeScript", "Structured Data", "Image Generation"],
      repoUrl: "",
      liveUrl: `${siteUrl}/blogs/inde-indian-craft-global-luxury-concept`,
      image: imageUrls["inde-logo"],
      type: "other",
      status: "concept",
      publishedAt: new Date("2026-07-12T06:49:20Z"),
      order: -66,
    },
    {
      name: "Pentest Copilot OSS",
      description: "BugBase's open-source, browser-based AI workspace for authorized penetration testing, with operator-supervised tools, evidence, findings, and engagement-aware MCP access.",
      techStack: ["TypeScript", "Next.js", "MCP", "Docker", "MongoDB", "Redis", "Burp Suite"],
      repoUrl: "https://github.com/bugbasesecurity/pentest-copilot",
      liveUrl: `${siteUrl}/blogs/adding-mcp-access-to-pentest-copilot-oss`,
      image: imageUrls["pentest-copilot-oss-logo"],
      type: "other",
      status: "active",
      publishedAt: new Date("2025-03-08T14:04:31Z"),
      order: -65,
    },
    {
      name: "Pentest Copilot Enterprise",
      description: "BugBase's production red-team automation platform for mapping and safely validating multi-cloud and internal attack paths with evidence and verified recovery.",
      techStack: ["Python", "Next.js", "Redis", "RabbitMQ", "Neo4j", "OIDC", "AWS", "Azure", "GCP"],
      repoUrl: "",
      liveUrl: `${siteUrl}/blogs/what-i-built-pentest-copilot-enterprise`,
      image: imageUrls["pentest-copilot-enterprise-logo"],
      type: "py",
      status: "production",
      publishedAt: new Date("2024-03-20T14:19:00Z"),
      order: -64,
    },
  ];
}

function blogRecords(imageUrls) {
  const author = { name: "Kathan Desai", url: `${siteUrl}/about` };
  return [
    {
      title: "Sentinel: Browser Tasks AI Agents Can Prove",
      slug: "building-sentinel-semantic-browser-runtime",
      excerpt: "The product use case and runtime design behind stable semantic targets, policy-gated browser actions, compact state diffs, and verified outcomes.",
      content: portfolioArticles.sentinel,
      tags: ["AI Agents", "Browser Automation", "MCP", "TypeScript", "Security"],
      category: "AI Systems",
      author,
      featuredImage: imageUrls["sentinel-poster"],
      videoEmbed: imageUrls["sentinel-video"],
      publishedAt: new Date("2026-08-10T20:54:00+05:30"),
      dateModified: syncedAt,
      isTopStory: true,
    },
    {
      title: "VideoMemory: Find the Useful Moment in a Long Video",
      slug: "videomemory-searchable-memory-for-ai-agents",
      excerpt: "How a local temporal-retrieval pipeline turns a question into a timestamp, transcript window, and query-selected visual evidence.",
      content: portfolioArticles.videomemory,
      tags: ["Video", "AI Agents", "MCP", "Python", "Semantic Search", "Open Source"],
      category: "Open Source",
      author,
      featuredImage: imageUrls["videomemory-poster"],
      videoEmbed: imageUrls["videomemory-video"],
      publishedAt: new Date("2026-08-10T20:48:00+05:30"),
      dateModified: syncedAt,
      isTopStory: false,
    },
    {
      title: "Video Studio: From Rough Capture to Publishable Story",
      slug: "video-studio-agentic-video-production-pipeline",
      excerpt: "The product workflow and engineering behind script planning, controlled capture, transcript-led editing, captions, audio, and delivery checks.",
      content: portfolioArticles.videoStudio,
      tags: ["Video", "Creative Tools", "AI Agents", "Python", "ffmpeg", "Open Source"],
      category: "Open Source",
      author,
      featuredImage: imageUrls["video-studio-poster"],
      videoEmbed: imageUrls["video-studio-video"],
      publishedAt: new Date("2026-08-10T20:42:00+05:30"),
      dateModified: syncedAt,
      isTopStory: false,
    },
    {
      title: "Swanlink: Many AI Agents, One Coordinated Outcome",
      slug: "swanlink-coordination-fabric-for-ai-agents",
      excerpt: "Why multi-agent work needs explicit ownership, acknowledgements, leases, evidence-bearing handoffs, recovery, and operational telemetry.",
      content: portfolioArticles.swanlink,
      tags: ["Multi-Agent Systems", "MCP", "Cloudflare Workers", "TypeScript", "Distributed Systems"],
      category: "AI Systems",
      author,
      featuredImage: imageUrls["swanlink-poster"],
      videoEmbed: imageUrls["swanlink-video"],
      publishedAt: new Date("2026-08-10T20:36:00+05:30"),
      dateModified: syncedAt,
      isTopStory: false,
    },
    {
      title: "Inde: Carrying Indian Craft Through a Luxury Product Journey",
      slug: "inde-indian-craft-global-luxury-concept",
      excerpt: "A transparent concept study connecting textile story, editorial design, contemporary silhouette, structured data, and made-to-order interaction.",
      content: portfolioArticles.inde,
      tags: ["Design Systems", "Next.js", "Fashion", "Image Generation", "Structured Data"],
      category: "Design",
      author,
      featuredImage: imageUrls["inde-poster"],
      videoEmbed: imageUrls["inde-video"],
      publishedAt: new Date("2026-08-10T20:30:00+05:30"),
      dateModified: syncedAt,
      isTopStory: false,
    },
    {
      title: "Pentest Copilot OSS: An AI Workspace for Authorized Testing",
      slug: "adding-mcp-access-to-pentest-copilot-oss",
      excerpt: "How the open-source product keeps scope, supervised tools, evidence, findings, and local MCP clients inside one engagement-aware control plane.",
      content: portfolioArticles.pentestOss,
      tags: ["Cybersecurity", "Pentest Copilot", "MCP", "TypeScript", "Open Source"],
      category: "Security Engineering",
      author,
      featuredImage: imageUrls["pentest-copilot-oss-poster"],
      videoEmbed: imageUrls["pentest-copilot-oss-video"],
      publishedAt: new Date("2026-08-10T20:24:00+05:30"),
      dateModified: syncedAt,
      isTopStory: false,
    },
    {
      title: "Pentest Copilot Enterprise: From Attack Paths to Verified Recovery",
      slug: "what-i-built-pentest-copilot-enterprise",
      excerpt: "The enterprise use case and systems I worked on: multi-cloud path coverage, capability-aware routing, evidence contracts, reversible execution, and scheduled assessments.",
      content: portfolioArticles.pentestEnterprise,
      tags: ["Cybersecurity", "Pentest Copilot", "Cloud Security", "Attack Paths", "Python", "Enterprise"],
      category: "Security Engineering",
      author,
      featuredImage: imageUrls["pentest-copilot-enterprise-poster"],
      videoEmbed: imageUrls["pentest-copilot-enterprise-video"],
      publishedAt: new Date("2026-08-10T20:18:00+05:30"),
      dateModified: syncedAt,
      isTopStory: false,
    },
  ];
}

async function syncDatabase(imageUrls) {
  await mongoose.connect(process.env.MONGODB_URI);
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB connection did not expose a database");

  const projects = database.collection("projects");
  const blogs = database.collection("blogs");

  await projects.updateMany(
    { status: { $exists: false } },
    { $set: { status: "active", updatedAt: syncedAt } }
  );

  for (const project of projectRecords(imageUrls)) {
    await projects.updateOne(
      { name: project.name },
      {
        $set: { ...project, updatedAt: syncedAt },
        $setOnInsert: { createdAt: syncedAt },
      },
      { upsert: true }
    );
  }

  for (const blog of blogRecords(imageUrls)) {
    await blogs.updateOne(
      { slug: blog.slug },
      {
        $set: { ...blog, updatedAt: syncedAt },
        $setOnInsert: { createdAt: syncedAt, readCount: 0, audioUrl: "" },
      },
      { upsert: true }
    );
  }

  await mongoose.disconnect();
}

try {
  console.log(`Uploading ${assets.length} portfolio assets to R2...`);
  const imageUrls = await uploadAssets();
  console.log("Upserting portfolio projects and articles into MongoDB...");
  await syncDatabase(imageUrls);
  console.log(`Portfolio sync complete: 7 projects, 7 articles, ${assets.length} R2 assets.`);
} catch (error) {
  await mongoose.disconnect().catch(() => {});
  throw error;
}
