import { pageMetadata } from "@/lib/page-metadata";
import Link from "next/link";

export const metadata = pageMetadata({"title": "Now", "description": "Kathan is in San Francisco, building Pentest Copilot Enterprise.", "path": "/now"});

export default function NowPage() {
  return (
    <article className="page-shell now-page">
      <header>
        <p className="page-kicker">Now</p>
        <h1>In San Francisco, building Pentest Copilot Enterprise.</h1>
        <p className="page-description">Pentest Copilot Enterprise is the main thing I am building. The work is making security testing feel clearer, faster, and more useful for the teams who do it every day.</p>
      </header>
      <Link className="text-link" href="/projects">See what I am working on</Link>
    </article>
  );
}
