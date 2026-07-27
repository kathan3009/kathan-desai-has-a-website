#!/usr/bin/env node
/**
 * Generates the raster art for web-slinger mode into public/spidey/.
 *
 *   OPENAI_API_KEY=sk-...  npm run spidey:art
 *   npm run spidey:art -- --only=skyline     # regenerate one asset
 *
 * Everything else in the mode is drawn procedurally. These two assets exist
 * because they are the things canvas and CSS genuinely cannot do: a painted
 * skyline with real depth, and a static social preview image.
 *
 * The site degrades cleanly if you never run this — the skyline is a CSS
 * background, so a missing file simply renders nothing.
 */

import { mkdir, writeFile, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import OpenAI from "openai";

const run = promisify(execFile);

const OUT_DIR = join(process.cwd(), "public", "spidey");

// Palette echoed from app/globals.css so the art lands in the same key.
const PALETTE =
  "Colour palette strictly limited to: near-black #07060F, deep indigo #12102B, " +
  "electric blue #2B54FF, arachnid red #F0303E, and a cyan #24E8DE rim light.";

const NO_SUBJECTS =
  "Absolutely no people, no figures, no characters, no animals, no logos, " +
  "no lettering, no text, no watermarks, no signage. Environment only.";

const ASSETS = [
  {
    name: "skyline",
    file: "skyline.jpg",
    // Neither asset needs alpha, so JPEG cuts them ~10x. See compress().
    maxDim: 1400,
    quality: 90,
    size: "1536x1024",
    // Opaque on pure black; the page composites it with mix-blend-mode:screen,
    // which drops the black out. Far more reliable than asking for alpha.
    background: "opaque",
    prompt: [
      "A PURE SOLID BLACK background, #000000, filling the entire frame.",
      "Against it, a dense city skyline defined ONLY by thin glowing edge",
      "lines — the buildings themselves are pure black and invisible, so you",
      "read the skyline purely from its lit edges, like a city at night from",
      "a rooftop.",
      "A thin bright red line runs down the left edge of each tower and a thin",
      "bright blue line runs down the right edge. Rooftop water tanks, antenna",
      "masts and fire escapes are picked out in the same thin lines.",
      "Scattered small lit windows as tiny flat solid rectangles in red and",
      "blue, denser lower down, sparse near the tops.",
      "Composition: the skyline sits along the BOTTOM of the frame, tallest",
      "spires reaching no higher than the middle. The entire upper half is",
      "pure flat black and completely empty.",
      "Crisp thin lines only. NO glow halo, NO bloom, NO neon outline around",
      "the whole shape, NO fog, NO haze, NO gradient sky, NO vignette, NO",
      "sticker border, NO rounded frame, NO drop shadow.",
      PALETTE,
      NO_SUBJECTS,
    ].join(" "),
  },
  {
    name: "og",
    file: "og.jpg",
    maxDim: 1200,
    quality: 82,
    size: "1536x1024",
    background: "opaque",
    prompt: [
      "A comic-book cover style graphic poster on a near-black background.",
      "A large spider web spun across the frame from the top-right corner:",
      "straight radial anchor threads and sagging spiral cross-threads, drawn",
      "as thin luminous silk-white lines with a deliberate red/blue offset",
      "printing misregistration on each line.",
      "Behind the web, a distant angular city skyline silhouette along the",
      "bottom edge with red and blue rim light.",
      "Overlaid across the whole image, a fine ben-day halftone dot screen in",
      "red and blue, like cheap comic newsprint.",
      "Dramatic, graphic, high contrast, lots of empty dark space in the",
      "centre-left of the frame.",
      PALETTE,
      NO_SUBJECTS,
    ].join(" "),
  },
];

const kb = async (p) => Math.round((await stat(p)).size / 1024);

/**
 * gpt-image-1 returns 2–4 MB PNGs, which is far too heavy to ship as a
 * background. Neither asset needs alpha, so downscale and re-encode to JPEG
 * with `sips` (present on macOS). Elsewhere, keep the PNG and say so.
 */
async function compress(rawPath, outPath, { maxDim, quality }) {
  try {
    await run("sips", [
      "-Z", String(maxDim),
      "-s", "format", "jpeg",
      "-s", "formatOptions", String(quality),
      rawPath,
      "--out", outPath,
    ]);
    await rm(rawPath, { force: true });
    console.log(`  Wrote public/spidey/${outPath.split("/").pop()} (${await kb(outPath)} KB)`);
  } catch {
    const fallback = outPath.replace(/\.jpg$/, ".png");
    await rm(fallback, { force: true });
    await run("mv", [rawPath, fallback]).catch(() => {});
    console.log(
      `  sips unavailable — kept public/spidey/${fallback.split("/").pop()} ` +
        `(${await kb(fallback)} KB). Compress it and update the path in app/globals.css.`
    );
  }
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      "OPENAI_API_KEY is not set.\n" +
        "Add it to .env.local (already gitignored) as:\n" +
        "  OPENAI_API_KEY=sk-...\n" +
        "then run: npm run spidey:art"
    );
    process.exit(1);
  }

  const only = process.argv
    .find((a) => a.startsWith("--only="))
    ?.slice("--only=".length);
  const names = ASSETS.map((a) => a.name);

  if (only && !names.includes(only)) {
    console.error(`Unknown asset "${only}". Available: ${names.join(", ")}`);
    process.exit(1);
  }

  const targets = only ? ASSETS.filter((a) => a.name === only) : ASSETS;

  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  const openai = new OpenAI({ apiKey });

  for (const asset of targets) {
    console.log(`Generating ${asset.file} …`);
    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: asset.prompt,
      size: asset.size,
      quality: "high",
      background: asset.background,
      output_format: "png",
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      console.error(`  No image returned for ${asset.name}. Skipped.`);
      continue;
    }

    const raw = join(OUT_DIR, `${asset.name}.raw.png`);
    await writeFile(raw, Buffer.from(b64, "base64"));
    await compress(raw, join(OUT_DIR, asset.file), asset);
  }

  console.log(
    "\nDone. The skyline appears behind the hero the next time you turn on web-slinger mode."
  );
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
