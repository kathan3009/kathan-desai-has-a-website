import { AUTHOR, COMPANY, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export function PersonSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": AUTHOR.id,
    name: AUTHOR.name,
    givenName: "Kathan",
    familyName: "Desai",
    url: SITE_URL,
    image: AUTHOR.image,
    email: `mailto:${AUTHOR.email}`,
    description: SITE_DESCRIPTION,
    jobTitle: "Founder",
    worksFor: { "@id": COMPANY.id },
    homeLocation: { "@type": "Place", name: "San Francisco, California" },
    knowsAbout: ["Cybersecurity", "Penetration testing", "Bug bounty programs", "AI agents", "Product engineering", "Photography"],
    sameAs: AUTHOR.sameAs,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
