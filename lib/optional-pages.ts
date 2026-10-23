import { cache } from "react";
import dbConnect from "@/lib/db";
import Skill from "@/models/Skill";
import Certification from "@/models/Certification";
import FAQ from "@/models/FAQ";

export const OPTIONAL_PAGES = [
  { path: "/skills", title: "Skills" },
  { path: "/certifications", title: "Certifications" },
  { path: "/faq", title: "FAQ" },
];
// These collections have no draft state. Once content exists, discoverability
// returns without requiring another deployment or a manual sitemap edit.
export const publishedOptionalPages = cache(async () => {
  if (!await dbConnect()) return [];
  const available = await Promise.all([Skill.exists({}), Certification.exists({}), FAQ.exists({})]);
  return OPTIONAL_PAGES.filter((_, index) => Boolean(available[index]));
});
