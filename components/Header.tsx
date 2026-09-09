"use client";
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
const links=[['/projects','Projects'],['/blogs','Writing'],['/photography','Photography'],['/about','About']];
export default function Header(){const path=usePathname();const [menu,setMenu]=useState(false);const home=path==='/';const menuButton=useRef<HTMLButtonElement>(null);
useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape' && menu){setMenu(false);menuButton.current?.focus();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[menu]);
return <header className={`portfolio-header ${home?'header-home':''} ${menu?'menu-open':''}`}><nav aria-label="Main navigation"><Link className="site-wordmark" href="/" onClick={()=>setMenu(false)}>Kathan Desai</Link><button ref={menuButton} className="nav-menu" aria-expanded={menu} aria-controls="public-navigation" onClick={()=>setMenu(!menu)}>{menu?'Close':'Menu'}</button><div className="public-navigation" id="public-navigation">{links.map(([href,label])=><Link key={href} href={href} aria-current={path.startsWith(href)?'page':undefined} onClick={()=>setMenu(false)}>{label}</Link>)}</div></nav></header>;}
