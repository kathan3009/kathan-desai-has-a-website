import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import { uploadBufferToR2 } from "@/lib/r2";
import OpenAI from "openai";

const TTS_MAX_CHARS = 4096;

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parsePodcastScript(script: string): Array<{ speaker: "host" | "guest"; text: string }> {
  const segments: Array<{ speaker: "host" | "guest"; text: string }> = [];
  const lines = script.split(/\n/);

  for (const line of lines) {
    const hostMatch = line.match(/^HOST:\s*(.+)/i);
    const guestMatch = line.match(/^GUEST:\s*(.+)/i);

    if (hostMatch) {
      const text = hostMatch[1].trim();
      if (text) segments.push({ speaker: "host", text });
    } else if (guestMatch) {
      const text = guestMatch[1].trim();
      if (text) segments.push({ speaker: "guest", text });
    }
  }

  return segments;
}

function chunkForTTS(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return text.trim() ? [text.trim()] : [];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      const t = remaining.trim();
      if (t) chunks.push(t);
      break;
    }
    const seg = remaining.slice(0, maxChars);
    const last = Math.max(seg.lastIndexOf(". "), seg.lastIndexOf("? "), seg.lastIndexOf("! "), seg.lastIndexOf(" "));
    const bp = last > maxChars * 0.3 ? last + (seg[last] === " " ? 1 : 2) : maxChars;
    const chunk = remaining.slice(0, bp).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(bp).trim();
  }
  return chunks;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await isAdminAuthenticated();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 503 }
    );
  }

  await dbConnect();
  const { id } = await params;
  const blog = await Blog.findById(id);
  if (!blog) {
    return NextResponse.json({ error: "Blog not found" }, { status: 404 });
  }

  const plainText = stripMarkdown(blog.content);
  const title = (blog.title as string) || "this article";
  const excerpt = (blog.excerpt as string) || plainText.slice(0, 160);

  if (plainText.length === 0) {
    return NextResponse.json(
      { error: "Blog has no content to convert" },
      { status: 400 }
    );
  }

  try {
    const openai = new OpenAI({ apiKey });

    const scriptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You create podcast scripts that sound like real human conversation. Format EXACTLY:
HOST: [host's line]
GUEST: [guest's line]
HOST: [host's line]
...

Make it feel HUMAN and CONVERSATIONAL:
- Mix short reactions with longer explanations. Real people say "Oh wow", "Right right", "Yeah exactly" before diving in.
- Include genuine curiosity: "Wait, so...", "How does that work?", "What do you mean by that?"
- Let them build on each other: "Yeah and then...", "Right, so the thing is...", "Exactly, that's the key part"
- Natural filler when it fits: "I mean", "you know", "like" - sparingly, like real speech
- React in the moment: surprise, agreement, "that's wild", "I never thought about it that way"
- Vary line length. Some exchanges should be quick back-and-forth. Others can breathe.
- Avoid: formal language, lecture mode, reading aloud, corporate-speak, overly polished
- Do NOT read the article verbatim. Talk about it like two friends unpacking something interesting.
- Host: warm, curious, asks real questions. Guest: casual SFO vibe, confident but chill, explains like he's at a coffee shop.
- Refer to it as a blog we're discussing. Cover the key ideas through natural dialogue.
- Each HOST or GUEST line must be under 3500 characters.`,
        },
        {
          role: "user",
          content: `We're doing a podcast about a blog post titled "${title}". Here's the content:

---
${plainText}
---

Write a conversation that feels like two real people talking. 

INTRO: Hook them immediately - a question, a bold take, or something that makes you lean in. Then welcome listeners, set the vibe, tease what we're covering. Keep it punchy. Hand off to the guest naturally.

BODY: Back-and-forth. Short reactions. Real questions. "Wait really?" "So what does that actually mean?" Let the guest explain, but the host should push back, get curious, react. It should feel like discovery, not a presentation.

OUTRO: Brief. Natural sign-off. Maybe a takeaway or "that was good, thanks for breaking it down."`,
        },
      ],
      temperature: 0.85,
    });

    const scriptText = scriptResponse.choices[0]?.message?.content?.trim();
    if (!scriptText) {
      throw new Error("GPT did not return a podcast script");
    }

    const parsed = parsePodcastScript(scriptText);
    if (parsed.length === 0) {
      throw new Error("Could not parse podcast script. Expected HOST: and GUEST: lines.");
    }

    const ttsSegments: Array<{ voice: "nova" | "echo"; input: string; instructions: string }> = [];
    const hostInstructions = "Speak in a warm, conversational tone like a friendly podcast host. Natural and engaging.";
    const guestInstructions = "Speak in a casual, confident tone like someone from San Francisco - laid-back but sharp, tech-savvy, approachable.";

    for (const { speaker, text } of parsed) {
      const chunks = chunkForTTS(text, TTS_MAX_CHARS);
      for (const chunk of chunks) {
        ttsSegments.push({
          voice: speaker === "host" ? "nova" : "echo",
          input: chunk,
          instructions: speaker === "host" ? hostInstructions : guestInstructions,
        });
      }
    }

    const segmentsRes = await Promise.all(
      ttsSegments.map((s) =>
        openai.audio.speech.create({
          model: "gpt-4o-mini-tts",
          voice: s.voice,
          input: s.input,
          response_format: "mp3",
          instructions: s.instructions,
        })
      )
    );

    const buffers = await Promise.all(
      segmentsRes.map((r) => r.arrayBuffer().then((ab) => Buffer.from(ab)))
    );
    const combined = Buffer.concat(buffers);

    const slug = (blog.slug as string).replace(/[^a-z0-9-_]/gi, "-");
    const key = `blog-audio/${slug}.mp3`;

    const audioUrl = await uploadBufferToR2(combined, "audio/mpeg", key);

    await Blog.findByIdAndUpdate(id, { audioUrl });

    return NextResponse.json({ audioUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audio generation failed";
    const status = message.includes("API") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
