import dbConnect from "@/lib/db";
import FAQ from "@/models/FAQ";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";
import { FAQPageSchema } from "@/components/schema/FAQPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Kathan Desai and bugbase.",
};

export default async function FAQPage() {
  const conn = await dbConnect();
  const items = conn ? await FAQ.find().sort({ order: 1 }) : [];

  const schemaItems = items.map((i) => ({ question: i.question, answer: i.answer }));

  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "FAQ", url: "/faq" }]} />
      {schemaItems.length > 0 && <FAQPageSchema items={schemaItems} url="/faq" />}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-12">FAQ</h1>
        <div className="space-y-8">
          {items.length === 0 ? (
            <p className="text-muted">No FAQ entries yet.</p>
          ) : (
            items.map((item) => (
              <section key={item._id.toString()}>
                <h2 className="text-lg font-semibold text-foreground mb-2">{item.question}</h2>
                <p className="text-muted leading-relaxed">{item.answer}</p>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}
