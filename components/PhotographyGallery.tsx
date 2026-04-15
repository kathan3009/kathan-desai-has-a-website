"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

export type PhotoItem = {
  _id: string;
  image: string;
  caption: string;
  category?: string;
};

type ViewMode = "list" | "grid";

const EAGER_GRID_COUNT = 6;

function isOptimizable(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.endsWith(".r2.dev") || u.hostname === "img.youtube.com";
  } catch {
    return url.startsWith("/");
  }
}

export default function PhotographyGallery({ photos }: { photos: PhotoItem[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted">No photos yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
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
          <CarouselView key="list" photos={photos} onPhotoClick={setLightboxIndex} />
        ) : (
          <GridView key="grid" photos={photos} onPhotoClick={setLightboxIndex} />
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}

/* ---------- Expand overlay (hover hint) ---------- */

function ExpandOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/25 group-hover:opacity-100 pointer-events-none">
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-white drop-shadow-lg"
      >
        <polyline points="15 3 21 3 21 9" />
        <polyline points="9 21 3 21 3 15" />
        <line x1="21" y1="3" x2="14" y2="10" />
        <line x1="3" y1="21" x2="10" y2="14" />
      </svg>
    </div>
  );
}

/* ---------- Lightbox ---------- */

function Lightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
}: {
  photos: PhotoItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const photo = photos[currentIndex];

  const goPrev = useCallback(() => {
    onNavigate((currentIndex - 1 + photos.length) % photos.length);
  }, [currentIndex, photos.length, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate((currentIndex + 1) % photos.length);
  }, [currentIndex, photos.length, onNavigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goPrev, goNext]);

  // Preload adjacent images so navigation is instant
  useEffect(() => {
    const toPreload: number[] = [];
    if (photos.length > 1) {
      toPreload.push((currentIndex + 1) % photos.length);
      toPreload.push((currentIndex - 1 + photos.length) % photos.length);
    }
    const links: HTMLLinkElement[] = [];
    for (const idx of toPreload) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = photos[idx].image;
      document.head.appendChild(link);
      links.push(link);
    }
    return () => links.forEach((l) => l.remove());
  }, [currentIndex, photos]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 z-10 text-white/70 hover:text-white transition-colors"
        aria-label="Close"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white/50 hover:text-white transition-colors"
            aria-label="Previous photo"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white/50 hover:text-white transition-colors"
            aria-label="Next photo"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      <div
        className="relative flex flex-col items-center max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-auto h-auto max-h-[80vh] max-w-[90vw]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={photo._id}
            src={photo.image}
            alt={photo.caption || "Photograph"}
            className="object-contain max-h-[80vh] max-w-[90vw] w-auto h-auto rounded-sm"
            draggable={false}
          />
        </div>
        {photo.caption && (
          <p className="mt-4 text-white/70 text-sm font-light italic tracking-wide text-center max-w-lg">
            {photo.caption}
          </p>
        )}
        {photos.length > 1 && (
          <p className="mt-2 text-white/40 text-xs tabular-nums">
            {currentIndex + 1} / {photos.length}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------- Carousel ---------- */

function CarouselView({ photos, onPhotoClick }: { photos: PhotoItem[]; onPhotoClick: (index: number) => void }) {
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
              eager={index <= 2}
              onClick={() => onPhotoClick(index)}
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
  eager,
  onClick,
}: {
  photo: PhotoItem;
  index: number;
  scrollState: { scrollLeft: number; containerWidth: number };
  scrollRef: React.RefObject<HTMLDivElement | null>;
  cardRef?: React.RefObject<HTMLElement | null>;
  eager: boolean;
  onClick: () => void;
}) {
  const internalCardRef = useRef<HTMLElement>(null);
  const cardRef = externalCardRef ?? internalCardRef;
  const [distanceFromCenter, setDistanceFromCenter] = useState(9999);
  const [loaded, setLoaded] = useState(false);

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
  }, [scrollRef, scrollState.scrollLeft, scrollState.containerWidth, cardRef]);

  const maxDistance = scrollState.containerWidth * 0.55;
  const centerFactor = Math.max(0, 1 - distanceFromCenter / maxDistance);
  const scale = 0.82 + 0.18 * centerFactor;
  const zIndex = Math.round(centerFactor * 100);

  return (
    <figure
      ref={cardRef}
      className="shrink-0 snap-center transition-transform duration-300 ease-out cursor-pointer"
      onClick={onClick}
      style={{
        width: "min(380px, 75vw)",
        maxWidth: "420px",
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        zIndex,
      }}
    >
      <div className="group relative aspect-[4/5] w-full min-h-0 overflow-hidden rounded-sm bg-card">
        <Image
          src={photo.image}
          alt={photo.caption || "Photograph"}
          fill
          sizes="(max-width: 506px) 75vw, 380px"
          className={`object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          priority={eager}
          unoptimized={!isOptimizable(photo.image)}
        />
        <ExpandOverlay />
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

/* ---------- Grid with occlusion culling ---------- */

function GridView({ photos, onPhotoClick }: { photos: PhotoItem[]; onPhotoClick: (index: number) => void }) {
  return (
    <div
      className="grid gap-4 sm:gap-6 md:gap-8"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
      }}
    >
      {photos.map((photo, index) => (
        <LazyGridCard key={photo._id} photo={photo} eager={index < EAGER_GRID_COUNT} onClick={() => onPhotoClick(index)} />
      ))}
    </div>
  );
}

function LazyGridCard({ photo, eager, onClick }: { photo: PhotoItem; eager: boolean; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (eager) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eager]);

  return (
    <figure className="cursor-pointer" onClick={onClick}>
      <div ref={ref} className="group relative aspect-[4/5] min-h-0 overflow-hidden rounded-sm bg-card">
        {visible && (
          <Image
            src={photo.image}
            alt={photo.caption || "Photograph"}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={`object-cover object-center transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setLoaded(true)}
            priority={eager}
            unoptimized={!isOptimizable(photo.image)}
          />
        )}
        <ExpandOverlay />
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
