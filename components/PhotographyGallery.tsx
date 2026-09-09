"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import styles from "./photography/photography.module.css";

export type PhotoItem = {
  _id: string;
  image: string;
  caption: string;
  category?: string;
};

type ViewMode = "list" | "grid";
const EAGER_GRID_COUNT = 6;

// Keep this aligned with next.config.ts; other sources use their original URL.
function isOptimizable(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (
      u.hostname === "pub-e6b13b1038d84eb5b4a3c0cf7bf0e50a.r2.dev" ||
      (u.hostname === "img.youtube.com" && u.pathname.startsWith("/vi/"))
    );
  } catch {
    return false;
  }
}

export default function PhotographyGallery({ photos }: { photos: PhotoItem[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  // The URL is the source of truth, including direct visits and Back/Forward.
  const selectedPhotoId = useSearchParams().get("photo");
  const closeLightbox = useCallback(() => {
    if (window.history.state?.photographyGallery) {
      window.history.back();
    } else {
      // A landing-page or shared link should close here, not leave the gallery.
      const url = new URL(window.location.href);
      url.searchParams.delete("photo");
      window.history.replaceState(null, "", url);
    }
  }, []);
  const searchId = useId();
  const categoryId = useId();
  const resultsId = useId();
  const categories = [...new Set(photos.map((p) => p.category?.trim()).filter((c): c is string => !!c))].sort();
  const search = query.trim().toLocaleLowerCase();
  const visiblePhotos = photos.filter((p) =>
    (!category || p.category?.trim() === category) &&
    (!search || `${p.caption} ${p.category || ""}`.toLocaleLowerCase().includes(search)),
  );
  const filtered = !!(query || category);
  // A shared link still resolves when the current local filters hide its photo.
  const lightboxPhotos = visiblePhotos.some((p) => p._id === selectedPhotoId) ? visiblePhotos : photos;
  const lightboxIndex = lightboxPhotos.findIndex((p) => p._id === selectedPhotoId);

  const openPhoto = (index: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("photo", visiblePhotos[index]._id);
    window.history.pushState({ photographyGallery: true }, "", url);
  };
  const navigatePhoto = (index: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("photo", lightboxPhotos[index]._id);
    // Next copies its internal router state itself. Passing it explicitly would
    // bypass its URL synchronization and leave useSearchParams stale.
    window.history.replaceState({ photographyGallery: !!window.history.state?.photographyGallery }, "", url);
  };

  if (!photos.length) {
    return <p className={styles.empty}>No photos yet. Check back soon.</p>;
  }

  return (
    <section className={styles.gallery} aria-label="Photo collection">
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <label className={styles.field} htmlFor={searchId}>
            <span>Search photographs</span>
            <input id={searchId} type="search" placeholder="Caption or category" value={query}
              aria-controls={resultsId} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {categories.length > 0 && (
            <label className={styles.field} htmlFor={categoryId}>
              <span>Category</span>
              <select id={categoryId} value={category} aria-controls={resultsId} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className={styles.viewToggle} role="group" aria-label="Gallery view">
          <button type="button" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}>List</button>
          <button type="button" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")}>Grid</button>
        </div>
      </div>
      <div className={styles.results}>
        <p role="status" aria-live="polite" aria-atomic="true">
          {filtered ? `${visiblePhotos.length} of ${photos.length}` : photos.length} {photos.length === 1 ? "photograph" : "photographs"}
        </p>
        {filtered && <button type="button" className={styles.textLink} onClick={() => { setQuery(""); setCategory(""); }}>Clear filters</button>}
      </div>
      <div id={resultsId}>
        {!visiblePhotos.length ? (
          <div className={styles.empty}><h2>No matching photographs.</h2><p>Try another caption or category, or clear the filters.</p></div>
        ) : viewMode === "list" ? (
          <CarouselView key={`list-${category}-${query}`} photos={visiblePhotos} onPhotoClick={openPhoto} />
        ) : (
          <div className={styles.grid}>
            {visiblePhotos.map((photo, index) => (
              <PhotoCard key={photo._id} photo={photo} index={index} eager={index < EAGER_GRID_COUNT} onClick={() => openPhoto(index)} />
            ))}
          </div>
        )}
      </div>
      {lightboxIndex >= 0 && (
        <Lightbox photos={lightboxPhotos} currentIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigatePhoto} />
      )}
    </section>
  );
}

function PhotoCard({ photo, index, eager, onClick }: { photo: PhotoItem; index: number; eager: boolean; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(eager);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (eager) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "300px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [eager]);

  return (
    <figure className={styles.photo}>
      <button ref={ref} type="button" className={styles.photoButton} onClick={onClick}
        aria-label={`Open photograph ${index + 1}${photo.caption ? `: ${photo.caption}` : ""}`} aria-haspopup="dialog">
        {(visible || eager) && !failed && <Image src={photo.image} alt={photo.caption || `Photograph ${index + 1}`} fill
          sizes="(max-width: 600px) 90vw, (max-width: 1000px) 45vw, 420px"
          className={styles.thumbnail} priority={eager} unoptimized={!isOptimizable(photo.image)} onError={() => setFailed(true)} />}
        {failed && <span className={styles.imageError}>Preview unavailable. Open photograph.</span>}
        <span className={styles.expand} aria-hidden="true">View photograph <span>↗</span></span>
      </button>
      {(photo.caption || photo.category) && <figcaption className={styles.caption}>
        {photo.caption && <p>{photo.caption}</p>}
        {photo.category && <span>{photo.category}</span>}
      </figcaption>}
    </figure>
  );
}

function CarouselView({ photos, onPhotoClick }: { photos: PhotoItem[]; onPhotoClick: (index: number) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ atStart: true, atEnd: false });
  const carouselId = useId();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setPosition({ atStart: el.scrollLeft <= 2, atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); el.removeEventListener("scroll", update); };
  }, []);

  const scroll = (direction: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const distance = card ? card.offsetWidth + parseFloat(getComputedStyle(el).columnGap || "0") : el.clientWidth;
    el.scrollBy({ left: direction * distance, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  return (
    <div>
      <div className={styles.carouselControls}>
        <p>Scroll to explore. Select a photograph to open it.</p>
        <div role="group" aria-label="Scroll photographs">
          <button type="button" className={styles.iconButton} aria-label="Scroll to previous photographs" aria-controls={carouselId} disabled={position.atStart} onClick={() => scroll(-1)}>←</button>
          <button type="button" className={styles.iconButton} aria-label="Scroll to next photographs" aria-controls={carouselId} disabled={position.atEnd} onClick={() => scroll(1)}>→</button>
        </div>
      </div>
      <div id={carouselId} ref={scrollRef} className={styles.carousel} role="region" aria-label="Photographs in a horizontal list" tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); scroll(e.key === "ArrowLeft" ? -1 : 1); }
        }}>
        {photos.map((photo, index) => <PhotoCard key={photo._id} photo={photo} index={index} eager={index < 3} onClick={() => onPhotoClick(index)} />)}
      </div>
    </div>
  );
}

function Lightbox({ photos, currentIndex, onClose, onNavigate }: {
  photos: PhotoItem[]; currentIndex: number; onClose: () => void; onNavigate: (index: number) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const photo = photos[currentIndex];
  const goPrev = () => onNavigate((currentIndex - 1 + photos.length) % photos.length);
  const goNext = () => onNavigate((currentIndex + 1) % photos.length);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (photos.length < 2) return;
    const adjacent = new Set([(currentIndex + 1) % photos.length, (currentIndex - 1 + photos.length) % photos.length]);
    const links = [...adjacent].map((index) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = photos[index].image;
      document.head.appendChild(link);
      return link;
    });
    return () => links.forEach((link) => link.remove());
  }, [currentIndex, photos]);

  return (
    <dialog ref={dialogRef} className={styles.lightbox} aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => {
        if (e.key === "Tab") {
          const controls = e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]');
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
          return;
        }
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
        if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      }}>
      <div className={styles.lightboxBar}>
        <p id={titleId}>Photograph {currentIndex + 1} of {photos.length}</p>
        <button type="button" className={styles.closeButton} onClick={onClose} autoFocus>Close <span aria-hidden="true">×</span></button>
      </div>
      <div className={styles.lightboxStage} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <OriginalPhoto key={photo._id} photo={photo} />
      </div>
      <div className={styles.lightboxFooter}>
        <div className={styles.lightboxCaption} aria-live="polite" aria-atomic="true">
          <p>{photo.caption || `Photograph ${currentIndex + 1}`}</p>
          {photo.category && <span>{photo.category}</span>}
          <SharePhotoLink key={photo._id} />
          <a href={photo.image} target="_blank" rel="noopener noreferrer" className={styles.textLink}>Open full-resolution image <span className={styles.srOnly}>(opens in a new tab)</span></a>
        </div>
        {photos.length > 1 && <div className={styles.lightboxNavigation} role="group" aria-label="Photo navigation">
          <button type="button" className={styles.iconButton} aria-label="Previous photo" onClick={goPrev}>←</button>
          <span aria-hidden="true">{currentIndex + 1} / {photos.length}</span>
          <button type="button" className={styles.iconButton} aria-label="Next photo" onClick={goNext}>→</button>
        </div>}
      </div>
    </dialog>
  );
}

function OriginalPhoto({ photo }: { photo: PhotoItem }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p className={styles.imageError} role="status">This photograph could not load. Try opening the full-resolution image below.</p> : (
    // The lightbox deliberately loads the original, without Next image resizing.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo.image} alt={photo.caption || "Photograph"} className={styles.original} draggable={false} onError={() => setFailed(true)} />
  );
}

function SharePhotoLink() {
  const [status, setStatus] = useState("");
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("Photo link copied.");
    } catch {
      setStatus("Copy the address from your browser to share this photograph.");
    }
  };

  return (
    <div>
      <button type="button" className={styles.textLink} onClick={copyLink}>Copy photo link</button>
      <span className={styles.shareStatus} role="status">{status}</span>
    </div>
  );
}
