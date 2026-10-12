import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = "Kathan Desai, founder of BugBase, building Pentest Copilot Enterprise in San Francisco";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({ title: "Founder of BugBase. Building Pentest Copilot Enterprise.", kicker: "Projects, writing and photographs from San Francisco" });
}
