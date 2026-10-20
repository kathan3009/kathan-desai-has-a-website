"use client";
/* The bar sits flush with the page until you scroll, then gains a hairline.
   Each label decodes through characters when pointed at, like the scenes on
   the home page, and a speck of lantern light marks the page you're on. */

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useReducedMotion } from './MotionPreference';

const links = [['/projects', 'Projects'], ['/blogs', 'Writing'], ['/photography', 'Photography'], ['/paint', 'Paint'], ['/about', 'About']];
const GLYPHS = '*+=/\\<>#%&@?';

function Scramble({ text, run }: { text: string; run: number }) {
  const [shown, setShown] = useState(text);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!run || reduced) return;
    let frame = 0;
    const start = performance.now(), length = 420;
    const tick = (now: number) => {
      const t = (now - start) / length;
      setShown([...text].map((c, i) => c === ' ' || t > (i + 1) / text.length * 0.85 + 0.15 ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join(''));
      if (t < 1) frame = requestAnimationFrame(tick); else setShown(text);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, text, reduced]);
  // The real word holds the width so the scramble never shifts the bar.
  return <span className="scramble"><span className="sr-only">{text}</span><span aria-hidden="true" className="scramble-hold">{text}</span><span aria-hidden="true" className="scramble-live">{shown}</span></span>;
}

function NavLink({ href, label, current, onClick, className }: { href: string; label: string; current?: boolean; onClick: () => void; className?: string }) {
  const [run, setRun] = useState(0);
  const go = () => setRun(n => n + 1);
  return <Link href={href} className={className} aria-current={current ? 'page' : undefined} onClick={onClick} onPointerEnter={go} onFocus={go}>
    <Scramble text={label} run={run} />
  </Link>;
}

export default function Header() {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && menu) { setMenu(false); menuButton.current?.focus(); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [menu]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const close = () => setMenu(false);
  return <header className={`portfolio-header ${menu ? 'menu-open' : ''}`} data-scrolled={scrolled || undefined}>
    <nav aria-label="Main navigation" data-gesture-scope>
      <NavLink className="site-wordmark" href="/" label="Kathan Desai" onClick={close} />
      <button ref={menuButton} className="nav-menu" aria-expanded={menu} aria-controls="public-navigation" onClick={() => setMenu(!menu)}>{menu ? 'Close' : 'Menu'}</button>
      <div className="public-navigation" id="public-navigation">
        {links.map(([href, label]) => <NavLink key={href} href={href} label={label} current={path.startsWith(href)} onClick={close} />)}
      </div>
    </nav>
  </header>;
}
