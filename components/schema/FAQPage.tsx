
import { absoluteUrl } from "@/lib/site";

type FAQItem = { question: string; answer: string };

export function FAQPageSchema({ items, url }: { items: FAQItem[]; url: string }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": absoluteUrl(url),
    url: absoluteUrl(url),
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
