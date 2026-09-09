import Link from 'next/link';
import PlayfulStatus from '@/components/PlayfulStatus';
export const metadata={title:'Now',description:'A playful guess at what Kathan is doing right now.'};
export default function NowPage(){return <div className="page-shell now-page"><h1>Right now.</h1><PlayfulStatus large/><p className="page-description">A random guess. Absolutely not connected to my laptop.</p><hr/><h2>Still building.</h2><p>AI for security at BugBase, and side projects that start with a question.</p><Link className="text-link" href="/projects">See what I’m working on →</Link></div>;}
