const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kathandesai.com";

type ArticleSchemaProps = {
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  image?: string;
  url: string;
};

export function ArticleSchema({
  headline,
  description,
  datePublished,
  dateModified,
  image,
  url,
}: ArticleSchemaProps) {
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
      name: "Kathan Desai",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Kathan Desai",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
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
