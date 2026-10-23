import { articleHeadings } from "@/lib/article-headings";
import { readingMinutes } from "./post-utils";
import styles from "./reading.module.css";

export function ArticleContents({ content }: { content: string }) {
  const headings = articleHeadings(content);
  const topLevel = Math.min(...headings.map(heading => heading.depth));
  const sections = headings.filter(heading => heading.depth === topLevel);
  if (sections.length < 3 || readingMinutes(content) < 5) return null;
  return <details className={styles.contents}>
    <summary>On this page</summary>
    <nav aria-label="Article sections"><ol>{sections.map(heading => <li key={heading.id}><a href={`#${heading.id}`}>{heading.text}</a></li>)}</ol></nav>
  </details>;
}
