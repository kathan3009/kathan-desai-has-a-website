import { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kathandesai.com";

// AI crawlers that respect robots.txt
const aiCrawlers = [
  "GPTBot", // OpenAI - ChatGPT training
  "ChatGPT-User", // OpenAI - real-time browsing
  "OAI-SearchBot", // OpenAI - SearchGPT
  "ClaudeBot", // Anthropic - Claude training
  "anthropic-ai", // Anthropic - Claude browsing
  "Google-Extended", // Google - Gemini training
  "PerplexityBot", // Perplexity AI
  "CCBot", // Common Crawl (used by many AI companies)
  "Bytespider", // ByteDance/TikTok
  "Meta-ExternalAgent", // Meta/LLaMA
  "Applebot-Extended", // Apple Intelligence
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...aiCrawlers.map((agent) => ({
        userAgent: agent,
        disallow: "/",
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
