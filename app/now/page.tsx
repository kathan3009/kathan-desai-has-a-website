import Link from 'next/link';
import PlayfulStatus from '@/components/PlayfulStatus';
export const metadata={title:'Now',description:'A playful guess at what Kathan is doing right now.'};
export default function NowPage(){return <div className="page-shell now-page"><h1>Right now.</h1><PlayfulStatus large/><p className="page-description">A random guess. It is not connected to my laptop.</p><hr/><h2>In San Francisco.</h2><p>I’m a founder of BugBase. Right now I’m building Pentest Copilot and a few smaller things.</p><Link className="text-link" href="/projects">See what I’m working on →</Link></div>;}
