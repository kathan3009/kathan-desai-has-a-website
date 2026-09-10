"use client";
import Link from 'next/link';
import {useSyncExternalStore} from 'react';
export const statuses=['in a meeting','sleeping','having food','watching reels','making something that didn’t need to exist','debugging one last thing'];
export function getPlayfulStatus(time:number){const n=Math.sin(Math.floor(time/900000)*12.9898)*43758.5453;return statuses[Math.floor((n-Math.floor(n))*statuses.length)];}
function subscribe(fn:()=>void){const timer=setInterval(fn,15000);return()=>clearInterval(timer);}
export function usePlayfulStatus(){const time=useSyncExternalStore(subscribe,()=>Math.floor(Date.now()/15000)*15000,()=>0);return time?getPlayfulStatus(time):'making something';}
export default function PlayfulStatus({large=false,plain=false}:{large?:boolean;plain?:boolean}){const status=usePlayfulStatus();if(plain)return <p className="playful-status-plain">Probably {status}.</p>;return large?<p className="now-statement">Probably {status}.</p>:<Link className="playful-status" href="/now">Probably {status} <span aria-hidden>↗</span></Link>;}
