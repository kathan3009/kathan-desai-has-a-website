import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";
import CopyCommand from "@/components/CopyCommand";
import "./photoshop-mcp.css";

const REPO = "https://github.com/kathan3009/photoshop-mcp";
const GUIDE = `${REPO}/blob/main/docs/INSTALLATION.md`;
const VIDEO = "https://github.com/kathan3009/photoshop-mcp/releases/download/v1.2.0/launch-video.mp4";
const POSTER = "/images/photoshop-mcp/poster.jpg";

export const metadata: Metadata = {
  title: "Photoshop MCP",
  description: "Let Claude, Cursor or Codex work inside the Photoshop running on your Mac. An open-source MCP server: install from GitHub and connect your AI client.",
  alternates: { canonical: "/photoshop-mcp" },
  openGraph: { type: "website", title: "Photoshop MCP — let your AI agent work in Photoshop", description: "Open-source Photoshop tools for Claude Code, Claude Desktop, Cursor and Codex. Run locally on macOS with Node.js.", images: ["/images/photoshop-mcp/og.jpg"], url: "/photoshop-mcp" },
  twitter: { card: "summary_large_image", title: "Photoshop MCP", description: "Let your AI agent work in Photoshop. Open source, runs locally on macOS.", images: ["/images/photoshop-mcp/og.jpg"] },
};

const TOOLS: [string, string][] = [
  ["See", "status, layer tree with stable ids, exact adjustment settings, sRGB renders (full image, a crop at 100%, or one layer solo), histogram and colour-cast numbers, point samples"],
  ["Documents", "open, create, duplicate, save as PSD/TIFF/PNG/JPEG (exports converted to sRGB), crop, resize, trim, flatten"],
  ["Layers", "pixel, group, solid and gradient fills, shapes, point and paragraph text with real fonts, placed images that cover or contain a box, move, resize, rotate, align, group, merge, clip"],
  ["Grade & retouch", "curves, levels, exposure, Light, hue/saturation with per-colour ranges, colour balance, vibrance, photo filter, black & white, gradient map, smart filters, AI Select Subject, masks"],
  ["Control", "undo/redo/snapshots, atomic batches (one undo step, rolls back on failure), play your recorded Actions"],
];

const SAFETY: [string, string][] = [
  ["Checkpoint before the first edit", "A history snapshot plus a layered copy of unsaved work on disk provides a recovery point before editing."],
  ["Your files stay yours", "Saving over a file needs overwrite: true. Closing an unsaved document needs discard: true. These are programmatic guards, not separate approval dialogs; ask your agent to get permission before overwriting or discarding work."],
  ["History and checkpoints", "Ask your agent to undo an edit or revert to a checkpoint. The optional desktop app adds a pause switch and history buttons."],
  ["One undo per step", "Each edit is one undo step. A batch groups several operations into one step and rolls back if it fails."],
  ["Nothing arbitrary", "The ExtendScript escape hatch is off unless you turn it on. Parameters are strictly validated, so a typo errors instead of silently doing nothing."],
];

export default function PhotoshopMcpPage() {
  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Projects", url: "/projects" }, { name: "Photoshop MCP", url: "/photoshop-mcp" }]} />
      <article className="page-shell psmcp">
        <header className="psmcp-hero">
          <p className="page-kicker">Open source · runs locally on macOS</p>
          <h1>Let your AI agent work in Photoshop.</h1>
          <p className="page-description">
            Photoshop MCP connects Claude Code, Claude Desktop, Cursor or Codex to the Photoshop already running on your Mac. The agent sees the picture, builds non-destructive layers, grades, masks, exports — with previews, checkpoints and undo.
          </p>
          <div className="psmcp-cta">
            <a className="psmcp-btn primary" href="#install">Install from source</a>
            <a className="psmcp-btn" href={REPO} target="_blank" rel="noreferrer">View on GitHub ↗</a>
            <a className="psmcp-btn ghost" href={GUIDE}>Setup &amp; troubleshooting</a>
          </div>
          <p className="psmcp-fineprint">
            macOS, licensed Photoshop, Git, Node.js 18+ with npm (prefer a supported LTS), and an MCP client. Tested with Photoshop 27.11.0; other versions are unverified. No Photoshop plugin or Apple Developer account needed.
          </p>
        </header>

        <section className="psmcp-steps psmcp-dev" id="install">
          <h2>Install from GitHub</h2>
          <p>Run these commands in Terminal from a folder where you want to keep the project:</p>
          <CopyCommand command={`git clone https://github.com/kathan3009/photoshop-mcp.git
cd photoshop-mcp
./scripts/install.sh --client claude-code`} />
          <p>Replace <code>claude-code</code> with <code>claude-desktop</code>, <code>cursor</code> or <code>codex</code>. The installer adds the MCP configuration and backs up existing config files. Keep the clone in place: your client uses its absolute path.</p>
          <ol>
            <li><strong>Restart your AI client</strong> after installation, then open Photoshop.</li>
            <li><strong>Ask it to run <code>ps_status</code>.</strong> Approve the macOS Automation request allowing the client or runtime to control Photoshop.</li>
            <li><strong>Try a disposable copy of a photo.</strong> Ask for a preview, make an edit, inspect the result, then try undo. Export to a new filename.</li>
          </ol>
          <blockquote>“Show me this photo, add a named exposure adjustment layer to brighten it slightly, then show the result. Leave the original file untouched.”</blockquote>
          <p>Connection trouble? Run <code>node bin/photoshop-mcp.mjs doctor</code> from the clone. See the <a className="text-link" href={GUIDE}>installation and troubleshooting guide</a> for permissions, updates and uninstall instructions.</p>
          <p className="psmcp-note">The old 1.2.0 DMGs are unnotarized and can show “damaged and can’t be opened.” Use the source install above for now. A notarized desktop release is pending.</p>
        </section>

        <section className="psmcp-video" aria-label="Optional desktop app demo, 24 seconds, with voiceover">
          <h2>The optional desktop interface</h2>
          <p className="psmcp-note">This earlier video and the screenshots below show the desktop app. The source install provides the editing, history and checkpoint tools through your AI client; it does not install the menu-bar interface.</p>
          <video controls playsInline preload="metadata" poster={POSTER}>
            <source src={VIDEO} type="video/mp4" />
          </video>
        </section>

        <section className="psmcp-shots">
          <figure><img src="/images/photoshop-mcp/app-overview.jpg" alt="Photoshop MCP overview tab with connect buttons for Claude Code, Claude Desktop, Cursor and Codex" loading="lazy" /><figcaption>The optional desktop app includes client connection controls.</figcaption></figure>
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
          <h2>Editing safeguards</h2>
          <dl>{SAFETY.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </section>

        <section className="psmcp-dev">
          <h2>Privacy, cost and validation</h2>
          <p>The server is free and MIT-licensed. Photoshop and your model provider may charge separately. Execution is local, but image previews and tool results go to your MCP client and may be sent to its model provider. Logs and checkpoints can contain sensitive image data and file paths.</p>
          <p>The latest validation passed 167 end-to-end checks against Photoshop 27.11.0, plus clean source-install and MCP startup checks. Other Photoshop versions are unverified. <a className="text-link" href={`${REPO}/blob/main/docs/VALIDATION.md`}>Read the validation notes</a>.</p>
          <p>The README documents the Photoshop quirks handled by the server, including layer placement, text sizes at different document resolutions and ExtendScript parsing.</p>
          <p><Link className="text-link" href="/blogs/photoshop-mcp-let-your-agent-work-in-photoshop">Read the build notes →</Link></p>
        </section>
      </article>
    </>
  );
}
