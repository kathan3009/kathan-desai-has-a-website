import dbConnect from "@/lib/db";
import Certification from "@/models/Certification";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Certifications",
  description: "Kathan Desai's certifications and credentials.",
};

export default async function CertificationsPage() {
  const conn = await dbConnect();
  const items = conn ? await Certification.find().sort({ order: 1 }) : [];

  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Certifications", url: "/certifications" }]} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-12">Certifications</h1>
        <div className="space-y-6">
          {items.length === 0 ? (
            <p className="text-muted">No certifications added yet.</p>
          ) : (
            items.map((item) => (
              <div key={item._id.toString()} className="card p-6">
                <p className="text-foreground font-semibold">{item.name}</p>
                <p className="text-muted">{item.issuer}</p>
                <p className="text-muted text-sm mt-1">{item.date}</p>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline text-sm mt-2 inline-block"
                  >
                    Verify →
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
