import dbConnect from "@/lib/db";
import Photo from "@/models/Photo";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";
import PhotographyGallery from "@/components/PhotographyGallery";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Photography",
  description: "Kathan Desai's photography — moments captured through the lens.",
};

export default async function PhotographyPage() {
  const conn = await dbConnect();
  const photos = conn ? await Photo.find().sort({ order: 1 }) : [];
  const photoItems = photos.map((p) => ({
    _id: p._id.toString(),
    image: p.image,
    caption: p.caption || "",
    category: p.category,
  }));

  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Photography", url: "/photography" }]} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20 pb-24 sm:pb-32 overflow-hidden">
        <header className="mb-12">
          <p className="text-[10px] text-accent font-semibold uppercase tracking-[0.3em] mb-2">Through the lens</p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Photography</h1>
          <p className="text-muted text-sm mt-4 max-w-xl">
            A collection of moments — captured with intention.
          </p>
        </header>

        <section>
          <PhotographyGallery photos={photoItems} />
        </section>
      </div>
    </>
  );
}
