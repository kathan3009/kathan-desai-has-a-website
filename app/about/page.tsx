import dbConnect from "@/lib/db";
import About from "@/models/About";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";
import { FAQPageSchema } from "@/components/schema/FAQPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About",
  description:
    "Kathan Desai is the Founder of bugbase. Learn about his background, bugbase, and what drives his work in cybersecurity.",
};

export default async function AboutPage() {
  const conn = await dbConnect();
  const items = conn ? await About.find().sort({ order: 1 }) : [];

  const schemaItems = items.map((i) => ({ question: i.question, answer: i.answer }));

  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "About", url: "/about" }]} />
      {schemaItems.length > 0 && <FAQPageSchema items={schemaItems} url="/about" />}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <header className="mb-12">
          <p className="text-[10px] text-accent font-semibold uppercase tracking-[0.3em] mb-2">Who I am</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">About</h1>
        </header>
        <div className="space-y-12">
          {items.length === 0 ? (
            <p className="text-muted">No content yet.</p>
          ) : (
            items.map((item) => (
              <section key={item._id.toString()}>
                <h2 className="text-xl font-semibold text-foreground mb-3">{item.question}</h2>
                <p className="text-muted leading-relaxed">{item.answer}</p>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}
