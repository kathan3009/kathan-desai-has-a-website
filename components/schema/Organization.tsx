import { AUTHOR, COMPANY } from "@/lib/site";

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": COMPANY.id,
    name: COMPANY.name,
    url: COMPANY.url,
    foundingDate: COMPANY.foundingDate,
    founder: { "@id": AUTHOR.id },
    sameAs: COMPANY.sameAs,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
