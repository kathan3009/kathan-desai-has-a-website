const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kathandesai.com";

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "bugbase",
    url: "https://bugbase.in",
    logo: `${SITE_URL}/logo.png`,
    sameAs: ["https://twitter.com/bugbase", "https://linkedin.com/company/bugbase"].filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
