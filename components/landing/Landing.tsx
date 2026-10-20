/* The home page is one picture and a few lines: one of the photographs
   redrawn in characters, the introduction, and three ways in. Warm light in
   the picture is the only colour on the page. */

import Link from 'next/link';
import HeroScene from './HeroScene';
import {projectHref} from '@/lib/projects';
import './landing.css';

export type LandingData={
  product:{id:string;name:string}|null;
  post:{slug:string;title:string}|null;
  scene:number;
};

export default function Landing({product,post,scene}:LandingData){
  const rows=[
    {label:'Building',title:product?.name??'Pentest Copilot Enterprise',href:product?projectHref(product):'/projects'},
    {label:'Latest essay',title:post?.title??'Notes and essays',href:post?`/blogs/${post.slug}`:'/blogs'},
    {label:'Photographs',title:'Away from the keyboard',href:'/photography'},
  ];

  return <div className="landing">
    <HeroScene initial={scene}/>
    <section className="intro" aria-labelledby="hero-title">
      <h1 id="hero-title">I’m Kathan.</h1>
      <p>I started <a href="https://bugbase.in" target="_blank" rel="noreferrer">BugBase</a> and I’m building Pentest Copilot in San Francisco.</p>
    </section>
    <nav className="index" aria-label="Start here">
      {rows.map(row=><Link key={row.label} href={row.href}><span>{row.label}</span><strong>{row.title}</strong></Link>)}
    </nav>
  </div>;
}
