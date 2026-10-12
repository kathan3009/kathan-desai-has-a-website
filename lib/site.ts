// One place for the facts every page, feed and schema repeats about the site.
// The served host is www; the apex redirects to it, so canonical URLs must say www.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.kathandesai.com").replace(/\/+$/, "");
export const SITE_NAME = "Kathan Desai";
export const SITE_TITLE = "Kathan Desai | Founder of BugBase";
export const SITE_DESCRIPTION =
  "Kathan Desai founded BugBase and is in San Francisco building Pentest Copilot Enterprise. Projects, writing, and photographs.";
export const AUTHOR = {
  name: "Kathan Desai",
  id: `${SITE_URL}/#person`,
  url: `${SITE_URL}/about`,
  image: `${SITE_URL}/kathan.JPG`,
  email: "kathan@bugbase.ai",
  handle: "@heykathan",
  sameAs: [
    "https://x.com/heykathan",
    "https://github.com/kathan3009",
    "https://www.linkedin.com/in/kathandesai1/",
    "https://bugbase.in",
  ],
};
export const COMPANY = {
  name: "BugBase",
  id: "https://bugbase.in/#organization",
  url: "https://bugbase.in",
  foundingDate: "2021",
  sameAs: ["https://twitter.com/bugbase", "https://linkedin.com/company/bugbase"],
};
export const absoluteUrl = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);
// Pages that set their own canonical must restate the feed, because a page's
// alternates replace the layout's rather than merging with them.
export const FEED_ALTERNATE = { "application/rss+xml": [{ url: "/feed.xml", title: "Kathan Desai: writing" }] };
