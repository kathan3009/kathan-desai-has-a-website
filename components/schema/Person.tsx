const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kathandesai.com";

export function PersonSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Kathan Desai",
    jobTitle: "Founder",
    worksFor: {
      "@type": "Organization",
      name: "bugbase",
      url: "https://bugbase.in",
    },
    url: SITE_URL,
    sameAs: [
      "https://x.com/kathandesai3009",
      "https://github.com/kathan3009",
      "https://www.linkedin.com/in/kathandesai1/",
    ].filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
