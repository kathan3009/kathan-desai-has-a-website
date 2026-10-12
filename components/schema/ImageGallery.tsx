import { AUTHOR, absoluteUrl } from "@/lib/site";

export function ImageGallerySchema({ photos }: { photos: { _id: string; image: string; caption: string }[] }) {
  if (!photos.length) return null;
  const schema = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    "@id": absoluteUrl("/photography"),
    name: "Photographs by Kathan Desai",
    url: absoluteUrl("/photography"),
    author: { "@id": AUTHOR.id },
    image: photos.map((photo) => ({
      "@type": "ImageObject",
      contentUrl: photo.image,
      url: absoluteUrl(`/photography?photo=${photo._id}`),
      ...(photo.caption && { name: photo.caption, caption: photo.caption }),
      creator: { "@id": AUTHOR.id },
      creditText: AUTHOR.name,
      copyrightNotice: `© ${AUTHOR.name}`,
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
