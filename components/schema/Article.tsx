const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kathandesai.com";

type ArticleSchemaProps = {
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  image?: string;
  url: string;
  authorName?: string;
  authorUrl?: string;
};

export function ArticleSchema({
  headline,
  description,
  datePublished,
  dateModified,
  image,
  url,
  authorName = "Kathan Desai",
  authorUrl = `${SITE_URL}/about`,
}: ArticleSchemaProps) {
  const resolvedAuthorUrl = authorUrl.startsWith("http") ? authorUrl : `${SITE_URL}${authorUrl.startsWith("/") ? "" : "/"}${authorUrl}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    description,
    datePublished,
    dateModified,
    url: url.startsWith("http") ? url : `${SITE_URL}${url}`,
    author: {
      "@type": "Person",
      name: authorName,
      url: resolvedAuthorUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Kathan Desai",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/kathan.JPG` },
    },
    ...(image && { image }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
