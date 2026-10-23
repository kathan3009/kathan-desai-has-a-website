import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Answer engines that fetch a page to cite it are welcome: being quoted with a
// link is the point of publishing. Google-Extended is an explicit exception:
// its one control enables both Gemini grounding and Gemini training. Other
// training crawlers remain blocked.
const answerEngines = [
  "OAI-SearchBot", // ChatGPT search index
  "ChatGPT-User", // ChatGPT fetching a page for a user
  "Claude-SearchBot", // Claude search index
  "Claude-User", // Claude fetching a page for a user
  "PerplexityBot",
  "Perplexity-User",
  "DuckAssistBot",
  "Applebot",
  "Google-Extended", // Gemini grounding + training (Google offers no separate switches)
];
const trainingCrawlers = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Bytespider",
  "Meta-ExternalAgent",
  "Applebot-Extended",
  "Amazonbot",
  "omgili",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      ...answerEngines.map((userAgent) => ({ userAgent, allow: "/", disallow: ["/api/"] })),
      ...trainingCrawlers.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
