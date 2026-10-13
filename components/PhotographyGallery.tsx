"use client";

/* Remote originals keep their natural dimensions in the visual story and lightbox.
   The story header names the category, so cards show only the caption. */
/* eslint-disable @next/next/no-img-element */

import {useState,useRef,useEffect,useCallback,useId} from "react";
import styles from "./photography/photography.module.css";

export type PhotoItem={_id:string;image:string;caption:string;category?:string};

function writeHistory(method:"push"|"replace",state:Record<string,unknown>,url:URL){
  if(method==="push")History.prototype.pushState.call(window.history,state,"",url);
  else History.prototype.replaceState.call(window.history,state,"",url);
}

export default function PhotographyGallery({photos}:{photos:PhotoItem[]}){
  const [selectedPhotoId,setSelectedPhotoId]=useState<string|null>(null);
  useEffect(()=>{const sync=()=>setSelectedPhotoId(new URL(window.location.href).searchParams.get("photo"));sync();window.addEventListener("popstate",sync);return()=>window.removeEventListener("popstate",sync);},[]);
  const closeLightbox=useCallback(()=>{if(window.history.state?.photographyGallery)window.history.back();else{const url=new URL(window.location.href);url.searchParams.delete("photo");writeHistory("replace",{...(window.history.state||{}),photographyGallery:false},url);setSelectedPhotoId(null);}},[]);
  const lightboxIndex=photos.findIndex(photo=>photo._id===selectedPhotoId);
  const openPhoto=(index:number)=>{const url=new URL(window.location.href);url.searchParams.set("photo",photos[index]._id);writeHistory("push",{...(window.history.state||{}),photographyGallery:true},url);setSelectedPhotoId(photos[index]._id);};
  const navigatePhoto=(index:number)=>{const url=new URL(window.location.href);url.searchParams.set("photo",photos[index]._id);writeHistory("replace",{...(window.history.state||{}),photographyGallery:!!window.history.state?.photographyGallery},url);setSelectedPhotoId(photos[index]._id);};
  if(!photos.length)return <p className={styles.empty}>No photographs yet.</p>;
  // Photos stay in admin order; consecutive photos with the same category form one story.
  const stories:{category:string;start:number;photos:PhotoItem[]}[]=[];
  photos.forEach((photo,index)=>{const category=photo.category?.trim()||"The mountains";const last=stories[stories.length-1];if(last&&last.category===category)last.photos.push(photo);else stories.push({category,start:index,photos:[photo]});});
  return <div className={styles.stories}>
    {stories.map(story=><section key={`${story.category}-${story.start}`} className={styles.gallery} aria-labelledby={`photo-story-${story.start}`}>
      <header className={styles.storyHeader}><div><p>Visual story · {String(story.photos.length).padStart(2,'0')} frames</p><h2 id={`photo-story-${story.start}`}>{story.category}</h2></div>{STORY_LINES[story.category]&&<p>{STORY_LINES[story.category]}</p>}</header>
      <div className={styles.storyList}>{story.photos.map((photo,offset)=><PhotoCard key={photo._id} photo={photo} index={story.start+offset} onClick={()=>openPhoto(story.start+offset)}/>)}</div>
    </section>)}
    {lightboxIndex>=0&&<Lightbox photos={photos} currentIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigatePhoto}/>}
  </div>;
}

const STORY_LINES:Record<string,string>={
  "The mountains":"Cold nights, long roads, monasteries, and the last light before dark.",
  "San Francisco":"The bridge at every hour, cypress against the fog, and a park full of herons.",
};

function PhotoCard({photo,index,onClick}:{photo:PhotoItem;index:number;onClick:()=>void}){
  const [failed,setFailed]=useState(false);
  return <figure className={styles.photo}><button type="button" className={styles.photoButton} onClick={onClick} aria-label={`Open photograph ${index+1}${photo.caption?`: ${photo.caption}`:""}`} aria-haspopup="dialog">
    {!failed&&<img src={photo.image} alt={photo.caption||`Photograph ${index+1}`} loading={index<2?"eager":"lazy"} fetchPriority={index===0?"high":"auto"} onError={()=>setFailed(true)}/>}
    {failed&&<span className={styles.imageError}>Preview unavailable. Open photograph.</span>}<span className={styles.expand} aria-hidden="true">Open <span>↗</span></span>
  </button>{photo.caption&&<figcaption className={styles.caption}><p>{photo.caption}</p></figcaption>}</figure>;
}

function Lightbox({photos,currentIndex,onClose,onNavigate}:{photos:PhotoItem[];currentIndex:number;onClose:()=>void;onNavigate:(index:number)=>void}){
  const dialogRef=useRef<HTMLDialogElement>(null);const titleId=useId();const photo=photos[currentIndex];const goPrev=()=>onNavigate((currentIndex-1+photos.length)%photos.length);const goNext=()=>onNavigate((currentIndex+1)%photos.length);
  useEffect(()=>{const dialog=dialogRef.current;const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;const overflow=document.body.style.overflow;dialog?.showModal();document.body.style.overflow="hidden";return()=>{dialog?.close();document.body.style.overflow=overflow;opener?.focus({preventScroll:true});};},[]);
  useEffect(()=>{if(photos.length<2)return;const adjacent=new Set([(currentIndex+1)%photos.length,(currentIndex-1+photos.length)%photos.length]);const links=[...adjacent].map(index=>{const link=document.createElement("link");link.rel="preload";link.as="image";link.href=photos[index].image;document.head.appendChild(link);return link;});return()=>links.forEach(link=>link.remove());},[currentIndex,photos]);
  return <dialog ref={dialogRef} className={styles.lightbox} data-gesture-scope aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}} onKeyDown={event=>{if(event.key==="Tab"){const controls=event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}return;}if(event.altKey||event.ctrlKey||event.metaKey)return;if(event.key==="ArrowLeft"){event.preventDefault();goPrev();}if(event.key==="ArrowRight"){event.preventDefault();goNext();}}}>
    <div className={styles.lightboxBar}><p id={titleId}>Photograph {currentIndex+1} of {photos.length}</p><button type="button" className={styles.closeButton} data-gesture-close onClick={onClose} autoFocus>Close <span aria-hidden="true">×</span></button></div>
    <div className={styles.lightboxStage} onClick={event=>{if(event.target===event.currentTarget)onClose();}}><OriginalPhoto key={photo._id} photo={photo}/></div>
    <div className={styles.lightboxFooter}><div className={styles.lightboxCaption} aria-live="polite" aria-atomic="true"><p>{photo.caption||`Photograph ${currentIndex+1}`}</p>{photo.category&&<span>{photo.category}</span>}<SharePhotoLink key={photo._id}/><a href={photo.image} target="_blank" rel="noopener noreferrer" className={styles.textLink}>Open full-resolution image <span className={styles.srOnly}>(opens in a new tab)</span></a></div>{photos.length>1&&<div className={styles.lightboxNavigation} role="group" aria-label="Photo navigation"><button type="button" className={styles.iconButton} aria-label="Previous photo" onClick={goPrev}>←</button><span aria-hidden="true">{currentIndex+1} / {photos.length}</span><button type="button" className={styles.iconButton} aria-label="Next photo" onClick={goNext}>→</button></div>}</div>
  </dialog>;
}

function OriginalPhoto({photo}:{photo:PhotoItem}){const [failed,setFailed]=useState(false);return failed?<p className={styles.imageError} role="status">This photograph could not load. Try the full-resolution link below.</p>:<img src={photo.image} alt={photo.caption||"Photograph"} className={styles.original} data-gesture-zoom draggable={false} onError={()=>setFailed(true)}/>;}
function SharePhotoLink(){const [status,setStatus]=useState("");const copy=async()=>{try{await navigator.clipboard.writeText(window.location.href);setStatus("Photo link copied.");}catch{setStatus("Copy the address from your browser to share this photograph.");}};return <div><button type="button" className={styles.textLink} onClick={copy}>Copy photo link</button><span className={styles.shareStatus} role="status">{status}</span></div>;}
