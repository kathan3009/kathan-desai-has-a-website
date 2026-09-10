import dbConnect from "@/lib/db";
import Photo from "@/models/Photo";
import { BreadcrumbListSchema } from "@/components/schema/BreadcrumbList";
import PhotographyGallery, { type PhotoItem } from "@/components/PhotographyGallery";
import styles from "@/components/photography/photography.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Photography",
  description: "Photographs by Kathan Desai, taken on the road and away from work.",
};

export default async function PhotographyPage({ searchParams }: {
  searchParams: Promise<{ photo?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedPhoto = typeof params.photo === "string" ? params.photo : "";
  let photoItems: PhotoItem[] = [];
  let unavailable = false;

  try {
    const conn = await dbConnect();
    if (conn) {
      const photos = await Photo.find().sort({ order: 1 });
      photoItems = photos.map((p) => ({
        _id: p._id.toString(),
        image: p.image,
        caption: p.caption || "",
        category: p.category || "",
      }));
    } else {
      unavailable = true;
    }
  } catch {
    unavailable = true;
  }

  return (
    <>
      <BreadcrumbListSchema items={[{ name: "Home", url: "/" }, { name: "Photography", url: "/photography" }]} />
      <div className={styles.page}>
        <div className="page-shell">
          <header className={styles.heading}>
            <div>
              <p className={styles.label}>Photography</p>
              <h1>Away from<br />the keyboard.</h1>
            </div>
            <p className={styles.intro}>A few things I stopped to look at.</p>
          </header>
          {unavailable ? (
            <div className={styles.empty} role="status">
              <h2>Photos are temporarily unavailable.</h2>
              <p>Please try loading the gallery again.</p>
              <a className={styles.textLink} href={requestedPhoto ? `/photography?photo=${encodeURIComponent(requestedPhoto)}` : "/photography"}>Reload gallery</a>
            </div>
          ) : (
            <PhotographyGallery photos={photoItems} />
          )}
        </div>
      </div>
    </>
  );
}
