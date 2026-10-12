import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Answer engines that fetch a page to cite it are welcome: being quoted with a
// link is the point of publishing. Crawlers that only collect training data
// stay out. Flip an agent between the two lists to change that policy.
const answerEngines = [
  "OAI-SearchBot", // ChatGPT search index
  "ChatGPT-User", // ChatGPT fetching a page for a user
  "Claude-SearchBot", // Claude search index
  "Claude-User", // Claude fetching a page for a user
  "PerplexityBot",
  "Perplexity-User",
  "DuckAssistBot",
  "Applebot",
];
const trainingCrawlers = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
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
