import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/db";
import Project from "@/models/Project";
import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { plainText } from "@/lib/seo";
import { projectStatusLabels } from "@/lib/projects";

export const alt = "Project by Kathan Desai";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conn = isValidObjectId(id) ? await dbConnect() : null;
  const project = conn ? await Project.findById(id).select("name description status image").lean() : null;
  if (!project) return ogCard({ title: "Projects by Kathan Desai", kicker: "AI, cybersecurity and useful side projects" });
  const image = typeof project.image === "string" && /^https?:\/\//.test(project.image) ? project.image : undefined;
  return ogCard({ title: String(project.name), kicker: plainText(String(project.description || ""), 90) || projectStatusLabels[String(project.status)] || undefined, image });
}
