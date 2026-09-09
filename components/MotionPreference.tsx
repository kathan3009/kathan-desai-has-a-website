"use client";
import { useEffect, useSyncExternalStore } from 'react';
const event='portfolio-motion';
function subscribe(fn:()=>void){const media=matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener('change',fn);window.addEventListener(event,fn);window.addEventListener('storage',fn);return()=>{media.removeEventListener('change',fn);window.removeEventListener(event,fn);window.removeEventListener('storage',fn);};}
function snapshot(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches||localStorage.getItem('kathan-quiet')==='true';}catch{return true;}}
export function useReducedMotion(){return useSyncExternalStore(subscribe,snapshot,()=>true);}
export default function MotionPreference(){const reduced=useReducedMotion();useEffect(()=>{document.documentElement.dataset.motion=reduced?"reduced":"full";},[reduced]);return <label className="motion-preference"><input type="checkbox" checked={reduced} onChange={e=>{try{localStorage.setItem('kathan-quiet',String(e.target.checked));}catch{}window.dispatchEvent(new Event(event));}}/>Reduce motion</label>;}
