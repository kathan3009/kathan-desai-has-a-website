import Link from "next/link";
import PlayfulStatus from "@/components/PlayfulStatus";

export const metadata = {
  title: "Now",
  description: "Kathan is in San Francisco, building Pentest Copilot.",
};

export default function NowPage() {
  return (
    <article className="page-shell now-page">
      <header>
        <p className="page-kicker">Now</p>
        <h1>In San Francisco, building Pentest Copilot.</h1>
        <p className="page-description">I am focused on making security testing feel clearer, faster, and more useful. It is the main product I am building at BugBase.</p>
      </header>
      <Link className="text-link" href="/projects">See what I am working on →</Link>
      <aside className="now-footnote" aria-label="A playful activity guess">
        <span>Meanwhile</span>
        <PlayfulStatus plain />
        <small>A random guess, not live activity.</small>
      </aside>
    </article>
  );
}
