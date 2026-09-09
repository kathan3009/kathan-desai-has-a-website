import { isValidElement, type ReactElement } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./MermaidDiagram";
import styles from "./reading/reading.module.css";

const components: Components = {
  a: ({ href, children, title, id, className, ...props }) => {
    const external = /^(https?:)?\/\//.test(href ?? "");
    return <a href={href} title={title} id={id} className={className}
      aria-label={props["aria-label"]} aria-describedby={props["aria-describedby"]}
      data-footnote-ref={props["data-footnote-ref" as keyof typeof props] as boolean | undefined}
      data-footnote-backref={props["data-footnote-backref" as keyof typeof props] as boolean | undefined}
      target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{children}</a>;
  },
  table: ({ children }) => (
    <div className={styles.tableScroll} role="region" aria-label="Scrollable table" tabIndex={0}>
      <table>{children}</table>
    </div>
  ),
  img: ({ src, alt, title, width, height }) => (
    // Keep arbitrary existing media hosts; next/image would restrict their URLs.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} title={title} width={width} height={height} loading="lazy" decoding="async" />
  ),
  pre: ({ children }) => {
    if (isValidElement(children)) {
      const code = children as ReactElement<{ className?: string; children?: unknown }>;
      if (/(?:^|\s)language-mermaid(?:\s|$)/.test(code.props.className ?? "")) {
        return <MermaidDiagram code={String(code.props.children ?? "").replace(/\n$/, "")} />;
      }
    }
    return <pre tabIndex={0} aria-label="Code block">{children}</pre>;
  },
};

export function MarkdownRenderer({ content }: { content: string }) {
  return <div className={styles.markdown}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{content}</ReactMarkdown>
  </div>;
}
