import { isValidElement, type ReactElement } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./MermaidDiagram";

function getCodeClassName(node: unknown): string {
  if (!isValidElement(node)) return "";
  const props = (node as ReactElement<{ className?: string }>).props;
  return props?.className ?? "";
}

function getCodeChildren(node: unknown): string {
  if (!isValidElement(node)) return "";
  const props = (node as ReactElement<{ children?: unknown }>).props;
  return typeof props?.children === "string" ? props.children : String(props?.children ?? "");
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-foreground mt-10 mb-4">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-foreground mt-10 mb-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold text-foreground mt-5 mb-2">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-muted leading-relaxed my-4">{children}</p>
  ),
  a: ({ href, children }) => {
    const safeHref = typeof href === "string" ? href : "";
    const external = safeHref.startsWith("http://") || safeHref.startsWith("https://");
    return (
      <a
        href={safeHref}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="text-accent hover:underline"
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-6 my-4 space-y-1 text-muted">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-6 my-4 space-y-1 text-muted">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-accent pl-4 my-6 italic text-muted">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border my-10" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-6">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-card border-b border-border">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
  th: ({ children }) => (
    <th className="text-left p-2 font-semibold text-foreground align-top">{children}</th>
  ),
  td: ({ children }) => <td className="p-2 text-muted align-top">{children}</td>,
  img: ({ src, alt }) => {
    const safeSrc = typeof src === "string" ? src : "";
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={safeSrc}
        alt={alt ?? ""}
        className="my-6 rounded-lg border border-border max-w-full mx-auto"
      />
    );
  },
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  code: (props) => {
    const { className, children } = props;
    const match = /language-(\w+)/.exec(className ?? "");
    const lang = match?.[1];
    const value = String(children ?? "").replace(/\n$/, "");

    if (lang === "mermaid") {
      return <MermaidDiagram code={value} />;
    }

    if (!className) {
      return (
        <code className="bg-card border border-border px-1 rounded text-accent text-sm">
          {children}
        </code>
      );
    }

    return (
      <code className={`text-sm text-foreground font-mono ${className}`}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => {
    const childClass = getCodeClassName(children);
    if (childClass.includes("language-mermaid")) {
      const code = getCodeChildren(children).replace(/\n$/, "");
      return <MermaidDiagram code={code} />;
    }
    return (
      <pre className="bg-card border border-border rounded p-4 overflow-x-auto my-6 text-sm font-mono leading-relaxed">
        {children}
      </pre>
    );
  },
};

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
