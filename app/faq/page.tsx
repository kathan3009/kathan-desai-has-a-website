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
      <div className="page-shell public-info">
        <header>
          <p className="page-kicker">Questions</p>
          <h1>FAQ</h1>
          <p className="page-description">Things people ask me often enough to write down.</p>
        </header>
        <div>
          {items.length === 0 ? (
            <p className="empty">No FAQ entries yet.</p>
          ) : (
            items.map((item) => (
              <section key={item._id.toString()} className="info-row reveal">
                <h2 className="text-[21px] leading-tight mb-2">{item.question}</h2>
                <p className="text-muted max-w-[680px]">{item.answer}</p>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}
