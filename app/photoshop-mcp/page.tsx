import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";
import "./photoshop-mcp.css";

const RELEASE = "https://github.com/kathan3009/photoshop-mcp/releases/latest";
const DMG_ARM = `${RELEASE}/download/Photoshop-MCP-1.2.0-arm64.dmg`;
const DMG_X64 = `${RELEASE}/download/Photoshop-MCP-1.2.0-x64.dmg`;
const REPO = "https://github.com/kathan3009/photoshop-mcp";
const VIDEO = "https://github.com/kathan3009/photoshop-mcp/releases/download/v1.2.0/launch-video.mp4";
const POSTER = "/images/photoshop-mcp/poster.jpg";

export const metadata: Metadata = {
  title: "Photoshop MCP",
  description: "Let Claude, Cursor or Codex work inside the Photoshop running on your Mac. A free menu-bar app: download, connect once, watch every edit.",
  alternates: { canonical: "/photoshop-mcp" },
  openGraph: { type: "website", title: "Photoshop MCP — let your AI agent work in Photoshop", description: "Free macOS app. Bundles the MCP server, connects to Claude Code, Claude Desktop, Cursor and Codex, shows every edit the agent makes.", images: ["/images/photoshop-mcp/og.jpg"], url: "/photoshop-mcp" },
  twitter: { card: "summary_large_image", title: "Photoshop MCP", description: "Let your AI agent work in Photoshop. Free macOS app.", images: ["/images/photoshop-mcp/og.jpg"] },
};

const TOOLS: [string, string][] = [
  ["See", "status, layer tree with stable ids, exact adjustment settings, sRGB renders (full image, a crop at 100%, or one layer solo), histogram and colour-cast numbers, point samples"],
  ["Documents", "open, create, duplicate, save as PSD/TIFF/PNG/JPEG (exports converted to sRGB), crop, resize, trim, flatten"],
  ["Layers", "pixel, group, solid and gradient fills, shapes, point and paragraph text with real fonts, placed images that cover or contain a box, move, resize, rotate, align, group, merge, clip"],
  ["Grade & retouch", "curves, levels, exposure, Light, hue/saturation with per-colour ranges, colour balance, vibrance, photo filter, black & white, gradient map, smart filters, AI Select Subject, masks"],
  ["Control", "undo/redo/snapshots, atomic batches (one undo step, rolls back on failure), play your recorded Actions"],
];

const SAFETY: [string, string][] = [
  ["Checkpoint before the first edit", "A history snapshot plus a layered copy of unsaved work on disk, so a Photoshop crash can't take the file with it."],
  ["Your files stay yours", "Saving over a file needs overwrite: true. Closing an unsaved document needs discard: true. The agent only gets those by asking you."],
  ["Pause switch", "One button in the app (and the menu bar) blocks every edit until you resume. Reads keep working."],
  ["One undo per step", "Every tool call is exactly one history state. The app's Undo button reverts the agent's last step; Revert goes back to the checkpoint."],
  ["Nothing arbitrary", "The ExtendScript escape hatch is off unless you turn it on. Parameters are strictly validated, so a typo errors instead of silently doing nothing."],
];

export default function PhotoshopMcpPage() {
  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Projects", url: "/projects" }, { name: "Photoshop MCP", url: "/photoshop-mcp" }]} />
      <article className="page-shell psmcp">
        <header className="psmcp-hero">
          <p className="page-kicker">Free macOS app · open source</p>
          <h1>Let your AI agent work in Photoshop.</h1>
          <p className="page-description">
            Photoshop MCP connects Claude Code, Claude Desktop, Cursor or Codex to the Photoshop already running on your Mac. The agent sees the picture, builds non-destructive layers, grades, masks, exports — and you watch every step, with a pause switch and undo.
          </p>
          <div className="psmcp-cta">
            <a className="psmcp-btn primary" href={DMG_ARM}>Download for Apple silicon</a>
            <a className="psmcp-btn" href={DMG_X64}>Intel Mac</a>
            <a className="psmcp-btn ghost" href={REPO} target="_blank" rel="noreferrer">Source on GitHub ↗</a>
          </div>
          <p className="psmcp-fineprint">
            macOS 13+, Photoshop 2025/2026 (tested on 27.11). Version 1.2.0, 125 MB. No Node, no plugin, no account. Unsigned build: on first launch, right-click the app and choose <em>Open</em>.
          </p>
        </header>

        <section className="psmcp-video" aria-label="Launch film, 24 seconds, with voiceover">
          <video controls playsInline preload="metadata" poster={POSTER}>
            <source src={VIDEO} type="video/mp4" />
          </video>
        </section>

        <section className="psmcp-steps">
          <h2>Three steps</h2>
          <ol>
            <li><strong>Open the app.</strong> It lives in your menu bar and bundles the server — nothing else to install.</li>
            <li><strong>Press Connect</strong> next to your client. Claude Code is registered through its CLI; Claude Desktop, Cursor and Codex get one entry in their config files (a backup is kept).</li>
            <li><strong>Ask your agent</strong> to run <code>ps_status</code> with Photoshop open. macOS asks once to allow controlling Photoshop. Then ask for real work.</li>
          </ol>
          <blockquote>“Open the raw, grade it warm and cinematic with adjustment layers, keep the sky from clipping, and export a 3000 px sRGB JPEG next to it.”</blockquote>
        </section>

        <section className="psmcp-shots">
          <figure><img src="/images/photoshop-mcp/app-overview.jpg" alt="Photoshop MCP overview tab with connect buttons for Claude Code, Claude Desktop, Cursor and Codex" loading="lazy" /><figcaption>Connect once. The app bundles the server, so your friends never install Node.</figcaption></figure>
          <figure><img src="/images/photoshop-mcp/app-activity.jpg" alt="Activity tab listing every tool call the agent made with timing and errors" loading="lazy" /><figcaption>Every call the agent makes, live, with arguments, timing and errors.</figcaption></figure>
          <figure><img src="/images/photoshop-mcp/app-gallery.jpg" alt="Gallery tab with the renders the agent looked at and the files it exported" loading="lazy" /><figcaption>What the agent looked at and what it exported, newest first.</figcaption></figure>
          <figure><img src="/images/photoshop-mcp/app-doctor.jpg" alt="Doctor tab showing green checks for Photoshop, permissions and registrations" loading="lazy" /><figcaption>Doctor checks Photoshop, automation permission and every registration.</figcaption></figure>
        </section>

        <section className="psmcp-grid">
          <h2>What the agent can do</h2>
          <dl>{TOOLS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          <p className="psmcp-note">Not covered: Camera Raw local masks, generative fill, brush strokes, 3D. Raw develop settings can still be driven by writing an <code>.xmp</code> sidecar before opening the file.</p>
        </section>

        <section className="psmcp-grid">
          <h2>Built so you can leave it running</h2>
          <dl>{SAFETY.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </section>

        <section className="psmcp-dev">
          <h2>For developers</h2>
          <p>The app is a thin shell over an MIT-licensed MCP server, CLI and agent skill that share one tested core — 165 end-to-end checks run against a live Photoshop. Prefer the terminal?</p>
          <pre><code>{`git clone https://github.com/kathan3009/photoshop-mcp.git
cd photoshop-mcp && scripts/install.sh`}</code></pre>
          <p>Everything verified live against Photoshop 27.11 is written up in the README: the quirks (new layers land inside a selected group, text sizes are points at document ppi, ExtendScript mis-parses nested ternaries) and how each one is handled.</p>
          <p><Link className="text-link" href="/blogs/photoshop-mcp-let-your-agent-work-in-photoshop">Read the build notes →</Link></p>
        </section>
      </article>
    </>
  );
}
