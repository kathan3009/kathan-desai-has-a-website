// The card behind every shared link: the dusk glow from the home page, the
// page title in the reader's serif, and the site name as a small signature.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const font = (file: string) => readFile(join(process.cwd(), "assets", "fonts", file));

export async function ogCard({ title, kicker, image }: { title: string; kicker?: string; image?: string }) {
  const [regular, medium] = await Promise.all([font("newsreader-latin-400-normal.woff"), font("newsreader-latin-500-normal.woff")]);
  const clipped = title.length > 110 ? `${title.slice(0, 108).trim()}…` : title;
  const size = clipped.length > 70 ? 54 : clipped.length > 40 ? 66 : 80;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#1d1d1f", color: "#f5f5f7", fontFamily: "Newsreader", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: -120, top: -200, width: 760, height: 760, borderRadius: 760, background: "radial-gradient(circle at 50% 50%, rgba(242,176,146,.55) 0%, rgba(213,154,168,.28) 40%, rgba(29,29,31,0) 70%)", display: "flex" }} />
        <div style={{ position: "absolute", right: -160, bottom: -260, width: 720, height: 720, borderRadius: 720, background: "radial-gradient(circle at 50% 50%, rgba(138,160,184,.5) 0%, rgba(138,160,184,.18) 45%, rgba(29,29,31,0) 72%)", display: "flex" }} />
        {image && (
          <div style={{ position: "absolute", right: 0, top: 0, width: 520, height: 630, display: "flex" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" width={520} height={630} style={{ objectFit: "cover", width: 520, height: 630 }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #1d1d1f 0%, rgba(29,29,31,.55) 35%, rgba(29,29,31,0) 100%)", display: "flex" }} />
          </div>
        )}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: image ? 760 : "100%", height: "100%" }}>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.3, color: "rgba(245,245,247,.72)", display: "flex" }}>Kathan Desai</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ fontSize: size, fontWeight: 500, lineHeight: 1.06, letterSpacing: -1.5, display: "flex", maxWidth: image ? 640 : 1000 }}>{clipped}</div>
            {kicker && <div style={{ fontSize: 28, fontWeight: 400, color: "rgba(245,245,247,.72)", display: "flex" }}>{kicker}</div>}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: "Newsreader", data: regular, weight: 400, style: "normal" }, { name: "Newsreader", data: medium, weight: 500, style: "normal" }] },
  );
}
