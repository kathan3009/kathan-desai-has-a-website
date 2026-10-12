/* The home page: a short introduction, then a grid of tiles where the product,
   the company, the two cities, the writing and the photographs each get a
   place. The photographs use their own colours for the only glow on the page. */
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import Clocks from './Clocks';
import './landing.css';

export type LandingData={
  projects:{id:string;name:string;description:string;stack:string[]}[];
  posts:{slug:string;title:string;excerpt:string;date:string}[];
  photos:{id:string;image:string;caption:string}[];
  available:boolean;
};

export default function Landing({projects,posts,photos,available}:LandingData){
  const [product,...experiments]=projects;
  const [tall,second,third]=photos;
  let i=0;
  const rise=(extra='')=>({className:`${extra} rise`.trim(),style:{'--i':i++} as React.CSSProperties});

  return <div className="landing">
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-glow" aria-hidden/>
      <h1 id="hero-title" {...rise()}>I’m Kathan.</h1>
      <p {...rise('hero-lead')}>I started <a href="https://bugbase.in" target="_blank" rel="noreferrer">BugBase</a> and I’m building Pentest Copilot in San Francisco.</p>
      <p {...rise('hero-aside')}>Useful technology, clear writing, and enough time outside to notice the light.</p>
      <div {...rise('hero-actions')}><Link className="pill" href="/projects">See the work</Link><Link className="pill-quiet" href="/blogs">Read the writing</Link></div>
    </section>

    <section className="bento" aria-label="Highlights">
      {product
        ? <Link href={`/projects/${product.id}`} className="tile tile-dark span-2 row-2 rise" style={{'--i':i++} as React.CSSProperties}>
            <small>Building now</small>
            <div><h2>{product.name}</h2><p>{product.description}</p><span className="tile-link">Open the project ›</span></div>
          </Link>
        : <div className="tile tile-dark span-2 row-2 rise" style={{'--i':i++} as React.CSSProperties}><small>Building now</small><div><h2>Pentest Copilot Enterprise</h2><p>{available?'Project details are on their way.':'Projects are temporarily unavailable.'}</p></div></div>}

      {tall
        ? <Link href={`/photography?photo=${tall.id}`} className="tile tile-photo row-2 rise" style={{'--i':i++} as React.CSSProperties}><img src={tall.image} alt={tall.caption||'Photograph by Kathan Desai'} loading="eager"/><span>{tall.caption||'Photography'}</span></Link>
        : <Link href="/photography" className="tile tile-photo row-2 rise" style={{'--i':i++} as React.CSSProperties}><img src="/images/monastery-preview.webp" alt="Key Monastery in snow" loading="eager"/><span>Photography</span></Link>}

      <div className="tile tile-clocks rise" style={{'--i':i++} as React.CSSProperties}><small>Two homes</small><Clocks reduced={false}/></div>

      <a href="https://bugbase.in" target="_blank" rel="noreferrer" className="tile tile-tint rise" style={{'--i':i++} as React.CSSProperties}><small>The company</small><div><h2>BugBase</h2><p>Security programs and bug bounties, since 2021.</p></div></a>

      <div className="tile span-2 rise" style={{'--i':i++} as React.CSSProperties}>
        <small>Writing</small>
        <ul className="tile-list">{posts.map(post=><li key={post.slug}><Link href={`/blogs/${post.slug}`}><span>{post.title}</span><time>{post.date}</time></Link></li>)}{posts.length===0&&<li><p>{available?'More writing is on its way.':'Writing is temporarily unavailable.'}</p></li>}</ul>
        <Link className="tile-link" href="/blogs">All essays ›</Link>
      </div>

      <div className="tile rise" style={{'--i':i++} as React.CSSProperties}>
        <small>Experiments</small>
        <ul className="tile-list tile-list-tight">{experiments.slice(0,3).map(project=><li key={project.id}><Link href={`/projects/${project.id}`}>{project.name}</Link></li>)}{experiments.length===0&&<li><p>{available?'More projects soon.':'Temporarily unavailable.'}</p></li>}</ul>
        <Link className="tile-link" href="/projects">All projects ›</Link>
      </div>

      <Link href="/now" className="tile rise" style={{'--i':i++} as React.CSSProperties}><small>Now</small><div><h2>San Francisco</h2><p>From New Delhi. Here for the work, for now.</p></div></Link>

      {second
        ? <Link href={`/photography?photo=${second.id}`} className="tile tile-photo span-2 tile-wide rise" style={{'--i':i++} as React.CSSProperties}><img src={second.image} alt={second.caption||'Photograph by Kathan Desai'} loading="lazy"/><span>{second.caption||'Photography'}</span></Link>
        : <Link href="/photography" className="tile tile-photo span-2 tile-wide rise" style={{'--i':i++} as React.CSSProperties}><img src="/images/night-original.webp" alt="A lit tent under the stars" loading="lazy"/><span>Photography</span></Link>}
      {third
        ? <Link href={`/photography?photo=${third.id}`} className="tile tile-photo span-2 tile-wide rise" style={{'--i':i++} as React.CSSProperties}><img src={third.image} alt={third.caption||'Photograph by Kathan Desai'} loading="lazy"/><span>{third.caption||'Photography'}</span></Link>
        : <Link href="/photography" className="tile tile-photo span-2 tile-wide rise" style={{'--i':i++} as React.CSSProperties}><img src="/images/dusk-1920.webp" alt="Alpenglow on a Himalayan ridge" loading="lazy"/><span>Away from the keyboard</span></Link>}
    </section>
  </div>;
}
