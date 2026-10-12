"use client";

/* The CMS photographs use their natural ratios to form the closing sequence. */
/* eslint-disable @next/next/no-img-element */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import {useEffect,useLayoutEffect,useRef,type SyntheticEvent} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import type {SceneState} from './Scene';
import Clocks from './Clocks';
import {useReducedMotion} from '../MotionPreference';
import './landing.css';

const Scene=dynamic(()=>import('./Scene'),{ssr:false,loading:()=> <div className="scene" aria-hidden><div className="scene-fallback"/></div>});
gsap.registerPlugin(ScrollTrigger);

export type LandingData={
  projects:{id:string;name:string;description:string;stack:string[]}[];
  posts:{slug:string;title:string;excerpt:string;date:string}[];
  photos:{id:string;image:string;caption:string}[];
  available:boolean;
};

function setPhotoRatio(event:SyntheticEvent<HTMLImageElement>){
  const image=event.currentTarget;
  image.parentElement?.style.setProperty('--photo-ratio',String(image.naturalWidth/image.naturalHeight));
}

export default function Landing({projects,posts,photos,available}:LandingData){
  const reduced=useReducedMotion();
  const ref=useRef<HTMLDivElement>(null);
  const state=useRef<SceneState>({progress:0,paused:false});

  useEffect(()=>{
    document.body.classList.add('on-landing');
    return()=>{document.body.classList.remove('on-landing');delete document.body.dataset.chapter;};
  },[]);

  useLayoutEffect(()=>{
    const ctx=gsap.context(()=>{
      // The header knows which chapter is on screen; the photograph only moves
      // while the hero is still visible.
      const sections=gsap.utils.toArray<HTMLElement>('.landing-chapter');
      sections.forEach(section=>ScrollTrigger.create({
        trigger:section,start:'top 52%',end:'bottom 48%',
        onToggle:self=>{if(self.isActive)document.body.dataset.chapter=section.id;},
      }));
      ScrollTrigger.create({
        trigger:'#home',start:'top top',end:'bottom top',
        onUpdate:self=>{state.current.progress=self.progress;window.dispatchEvent(new Event('scenechange'));},
      });
      if(!reduced){
        gsap.fromTo('.hero-copy > *',{opacity:0,y:14},{opacity:1,y:0,stagger:.06,duration:.7,ease:'power3.out',clearProps:'opacity,transform'});
        gsap.to('.hero-content',{opacity:0,y:-24,ease:'none',scrollTrigger:{trigger:'#home',start:'bottom 100%',end:'bottom 55%',scrub:true}});
      }
    },ref);
    return()=>ctx.revert();
  },[reduced]);

  return <div ref={ref} className={`landing ${reduced?'motion-quiet':''}`}>
    <section className="landing-chapter landing-hero" id="home">
      <Scene state={state} reduced={reduced}/><div className="scene-shade" aria-hidden/>
      <div className="landing-content hero-content">
        <div className="hero-copy">
          <p className="chapter-label">Founder · Builder · Photographer</p>
          <h1>I’m Kathan.</h1>
          <p className="hero-lead">I started <a href="https://bugbase.in" target="_blank" rel="noreferrer">BugBase</a> and I’m building Pentest Copilot in San Francisco.</p>
          <p className="hero-aside">I like useful technology, clear writing, and getting far enough from a screen to notice the light.</p>
          <a className="landing-link hero-link" href="https://copilot.bugbase.ai" target="_blank" rel="noreferrer">Pentest Copilot Enterprise ↗</a>
        </div>
      </div>
    </section>

    <section className="landing-chapter" id="bugbase">
      <div className="landing-content landing-split">
        <div className="landing-intro"><p className="chapter-label">The company</p><h2>BugBase.</h2><p>I started it with three friends when I was 20. What began in a college dorm became the company behind Pentest Copilot Enterprise, which is where my days go now.</p><a className="landing-link" href="https://bugbase.in" target="_blank" rel="noreferrer">Visit BugBase ↗</a></div>
        <dl className="landing-facts" aria-label="BugBase at a glance">
          <div><dt>Founded</dt><dd>2021, New Delhi</dd></div>
          <div><dt>What it does</dt><dd>Managed security programs and bug bounties for companies.</dd></div>
          <div><dt>Now building</dt><dd>Pentest Copilot Enterprise, an AI-native pentesting platform.</dd></div>
        </dl>
      </div>
    </section>

    <section className="landing-chapter" id="building">
      <div className="landing-content landing-split">
        <div className="landing-intro"><p className="chapter-label">The work</p><h2>Things I’ve built.</h2><p>The product in focus, followed by the experiments that taught me something.</p><Link className="landing-link" href="/projects">See all projects →</Link></div>
        <div className="landing-projects">{projects.map((project,index)=><article key={project.id}><small>{index===0?'Current product':'Recent experiment'}</small><h3><Link href={`/projects/${project.id}`}>{project.name}</Link></h3><p>{project.description}</p>{project.stack.length>0&&<div>{project.stack.slice(0,4).join(' · ')}</div>}</article>)}{projects.length===0&&<p>{available?'More projects are on their way.':'Projects are temporarily unavailable.'}</p>}</div>
      </div>
    </section>

    <section className="landing-chapter" id="writing">
      <div className="landing-content landing-split">
        <div className="landing-intro"><p className="chapter-label">The thinking</p><h2>Writing it down.</h2><p>Build notes and ideas I wanted to understand well enough to explain.</p><Link className="landing-link" href="/blogs">Read the writing →</Link></div>
        <div className="landing-essays">{posts.map(post=><Link key={post.slug} href={`/blogs/${post.slug}`}><small>{post.date}</small><h3>{post.title}</h3></Link>)}{posts.length===0&&<p>{available?'More writing is on its way.':'Writing is temporarily unavailable.'}</p>}</div>
      </div>
    </section>

    <section className="landing-chapter landing-life" id="life">
      <div className="landing-content life-content">
        <div className="life-heading"><div><p className="chapter-label">Outside the work</p><h2>Life, in between.</h2></div><div className="life-copy"><p>From New Delhi. In San Francisco, for now. I write, take photographs, and keep making small things because I’m curious.</p><div><Link href="/about">About me →</Link><Link href="/photography">Photography →</Link></div></div></div>
        <div className="landing-photo-strip">{photos.map(photo=><Link key={photo.id} href={`/photography?photo=${photo.id}`}><img src={photo.image} alt={photo.caption||'Photograph by Kathan Desai'} loading="lazy" onLoad={setPhotoRatio}/><span>{photo.caption}</span></Link>)}</div>
        <div className="life-footer"><span>Two places I call home.</span><div className="life-clocks"><Clocks reduced={reduced}/></div></div>
      </div>
    </section>
  </div>;
}
