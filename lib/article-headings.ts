import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root, RootContent } from "mdast";

export type ArticleHeading = { id: string; text: string; depth: number };
function nodeText(node: RootContent): string {
  if ("value" in node) return node.value;
  if (node.type === "image" || node.type === "imageReference") return node.alt || "";
  if ("children" in node) return node.children.map(child => nodeText(child as RootContent)).join("");
  return "";
}
function assignHeadings(tree: Root): ArticleHeading[] {
  const used = new Set<string>();
  const headings: ArticleHeading[] = [];
  const visit = (node: Root | RootContent) => {
    if (node.type === "heading") {
      const text = nodeText(node).trim();
      const base = "section-" + (text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-") || "heading");
      let id = base;
      let suffix = 2;
      while (used.has(id)) id = `${base}-${suffix++}`;
      used.add(id);
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };
      headings.push({ id, text, depth: Math.max(2, node.depth) });
    }
    if ("children" in node) node.children.forEach(child => visit(child as RootContent));
  };
  visit(tree);
  return headings;
}
export function articleHeadings(content: string): ArticleHeading[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(content);
  return assignHeadings(tree);
}
export function remarkArticleHeadings() {
  return (tree: Root) => { assignHeadings(tree); };
}
