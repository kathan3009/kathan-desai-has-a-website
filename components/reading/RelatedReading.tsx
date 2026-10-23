import Link from "next/link";
import { blogCatalog, relatedPosts } from "@/lib/blog-catalog";
import styles from "./reading.module.css";

export async function RelatedReading({ slug }: { slug: string }) {
  const posts = relatedPosts(slug, await blogCatalog());
  if (!posts.length) return null;
  return <aside className={styles.related} aria-labelledby="related-reading-title">
    <h2 id="related-reading-title">Related reading</h2>
    <ul>{posts.map(post => <li key={post.slug}><Link href={`/blogs/${encodeURIComponent(post.slug)}`}>{post.title}</Link></li>)}</ul>
  </aside>;
}
