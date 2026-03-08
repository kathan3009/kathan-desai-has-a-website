"use client";

import { useState, useRef, useEffect } from "react";

export type PhotoItem = {
  _id: string;
  image: string;
  caption: string;
  category?: string;
};

type ViewMode = "list" | "grid";

export default function PhotographyGallery({ photos }: { photos: PhotoItem[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  if (photos.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted">No photos yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* LIST | GRID Toggle */}
      <div className="flex justify-end">
        <div className="flex gap-2 text-sm text-muted">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 transition-colors ${
              viewMode === "list" ? "text-foreground font-medium" : "hover:text-foreground"
            }`}
          >
            LIST
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1 transition-colors ${
              viewMode === "grid" ? "text-foreground font-medium" : "hover:text-foreground"
            }`}
          >
            GRID
          </button>
        </div>
      </div>

      <div className="relative min-h-[320px]">
        {viewMode === "list" ? (
          <CarouselView key="list" photos={photos} />
        ) : (
          <MasonryGrid key="grid" photos={photos} />
        )}
      </div>
    </div>
  );
}

function CarouselView({ photos }: { photos: PhotoItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const secondCardRef = useRef<HTMLElement | null>(null);
  const [scrollState, setScrollState] = useState({ scrollLeft: 0, containerWidth: 0 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      setScrollState({ scrollLeft: el.scrollLeft, containerWidth: el.clientWidth });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Default to second image so there's content on both left and right
  useEffect(() => {
    const card = secondCardRef.current;
    const container = scrollRef.current;
    if (card && container && photos.length > 1) {
      card.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
    }
  }, [photos.length]);

  return (
    <div className="relative -mx-6">
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory py-10 px-6"
      >
        <div
          className="flex items-center gap-4 md:gap-6 pb-4"
          style={{
            minWidth: "min-content",
            paddingLeft: "calc(50vw - min(190px, 37.5vw))",
            paddingRight: "calc(50vw - min(190px, 37.5vw))",
          }}
        >
          {photos.map((photo, index) => (
            <CarouselCard
              key={photo._id}
              photo={photo}
              index={index}
              scrollState={scrollState}
              scrollRef={scrollRef}
              cardRef={index === 1 ? secondCardRef : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CarouselCard({
  photo,
  scrollState,
  scrollRef,
  cardRef: externalCardRef,
}: {
  photo: PhotoItem;
  index: number;
  scrollState: { scrollLeft: number; containerWidth: number };
  scrollRef: React.RefObject<HTMLDivElement | null>;
  cardRef?: React.RefObject<HTMLElement | null>;
}) {
  const internalCardRef = useRef<HTMLElement>(null);
  const cardRef = externalCardRef ?? internalCardRef;
  const [distanceFromCenter, setDistanceFromCenter] = useState(9999);

  useEffect(() => {
    const card = cardRef.current;
    const container = scrollRef.current;
    if (!card || !container) return;

    const update = () => {
      const containerRect = container.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const containerCenterX = containerRect.left + containerRect.width / 2;
      const cardCenterX = cardRect.left + cardRect.width / 2;
      setDistanceFromCenter(Math.abs(cardCenterX - containerCenterX));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    container.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      container.removeEventListener("scroll", update);
    };
  }, [scrollRef, scrollState.scrollLeft, scrollState.containerWidth]);

  const maxDistance = scrollState.containerWidth * 0.55;
  const centerFactor = Math.max(0, 1 - distanceFromCenter / maxDistance);
  const scale = 0.82 + 0.18 * centerFactor;
  const zIndex = Math.round(centerFactor * 100);

  return (
    <figure
      ref={cardRef}
      className="shrink-0 snap-center transition-transform duration-300 ease-out"
      style={{
        width: "min(380px, 75vw)",
        maxWidth: "420px",
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        zIndex,
      }}
    >
      <div className="relative flex aspect-[4/5] w-full min-h-0 items-center justify-center overflow-hidden rounded-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.image}
          alt={photo.caption || "Photograph"}
          className="w-full h-full object-cover"
        />
      </div>
      {photo.caption && (
        <figcaption className="mt-3 text-center">
          <p className="text-muted text-sm font-light italic tracking-wide line-clamp-2">
            {photo.caption}
          </p>
        </figcaption>
      )}
    </figure>
  );
}

function MasonryGrid({ photos }: { photos: PhotoItem[] }) {
  return (
    <div
      className="grid gap-4 sm:gap-6 md:gap-8"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
      }}
    >
      {photos.map((photo) => (
        <MasonryCard key={photo._id} photo={photo} />
      ))}
    </div>
  );
}

function MasonryCard({ photo }: { photo: PhotoItem }) {
  return (
    <figure>
      <div className="relative flex aspect-[4/5] min-h-0 items-center justify-center overflow-hidden rounded-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.image}
          alt={photo.caption || "Photograph"}
          className="w-full h-full object-cover object-center"
        />
      </div>
      {photo.caption && (
        <figcaption className="mt-3">
          <p className="text-muted text-sm font-light italic tracking-wide line-clamp-2">
            {photo.caption}
          </p>
        </figcaption>
      )}
    </figure>
  );
}
