import { AUTHOR, absoluteUrl } from "@/lib/site";

type ArticleSchemaProps = {
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  image?: string;
  url: string;
  authorName?: string;
  authorUrl?: string;
  keywords?: string[];
  section?: string;
  wordCount?: number;
};

export function ArticleSchema({ headline, description, datePublished, dateModified, image, url, authorName, authorUrl, keywords, section, wordCount }: ArticleSchemaProps) {
  const self = absoluteUrl(url);
  const author = !authorName || authorName === AUTHOR.name
    ? { "@id": AUTHOR.id }
    : { "@type": "Person", name: authorName, ...(authorUrl ? { url: absoluteUrl(authorUrl) } : {}) };
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": self,
    mainEntityOfPage: { "@type": "WebPage", "@id": self },
    headline,
    description,
    datePublished,
    dateModified,
    url: self,
    inLanguage: "en",
    author,
    publisher: { "@id": AUTHOR.id },
    ...(image && { image: absoluteUrl(image) }),
    ...(keywords?.length && { keywords: keywords.join(", ") }),
    ...(section && { articleSection: section }),
    ...(wordCount && { wordCount }),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
