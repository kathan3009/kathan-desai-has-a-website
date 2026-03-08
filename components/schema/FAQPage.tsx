const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kathandesai.com";

type FAQItem = { question: string; answer: string };

export function FAQPageSchema({ items, url }: { items: FAQItem[]; url: string }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
