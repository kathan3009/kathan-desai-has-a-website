"use client";
import { useSyncExternalStore } from 'react';
function greeting(){const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening';}
function subscribe(fn:()=>void){const timer=setInterval(fn,60000);return()=>clearInterval(timer);}
export default function TimeGreeting(){const text=useSyncExternalStore(subscribe,greeting,()=> 'Hi');return <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tight">{text},<br/>I’m Kathan.</h1>;}
