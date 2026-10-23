import { cache } from "react";
import { pageMetadata } from "@/lib/page-metadata";
import dbConnect from "@/lib/db";
import Certification from "@/models/Certification";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";

export const dynamic = "force-dynamic";

const getItems = cache(async () => {
  const conn = await dbConnect();
  return conn ? await Certification.find().sort({ order: 1 }) : [];
});

export async function generateMetadata() {
  const items = await getItems();
  return pageMetadata({ title: "Certifications", description: "Kathan Desai’s certifications and credentials.", path: "/certifications", index: items.length > 0 });
}

export default async function CertificationsPage() {
  const items = await getItems();

  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Certifications", url: "/certifications" }]} />
      <div className="page-shell public-info">
        <header>
          <p className="page-kicker">Credentials</p>
          <h1>Certifications</h1>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.length === 0 ? (
            <p className="empty">No certifications added yet.</p>
          ) : (
            items.map((item) => (
              <article key={item._id.toString()} className="card flex flex-col gap-1">
                <p className="text-foreground font-semibold text-[19px] tracking-[-0.02em] leading-tight">{item.name}</p>
                <p className="text-muted">{item.issuer}</p>
                <p className="text-muted text-[14px]">{item.date}</p>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-link mt-2">
                    Verify <span aria-hidden>↗</span>
                  </a>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </>
  );
}
