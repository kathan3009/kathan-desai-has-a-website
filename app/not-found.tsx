import Link from 'next/link';
import AsciiScene from '@/components/ascii/AsciiScene';

export default function NotFound(){return <div className="simple-error">
  <div className="error-scene"><AsciiScene src="/images/dusk-1920.webp" label="The last light on a Himalayan ridge, drawn in text characters" focus={[0.55,0.55]}/></div>
  <div className="error-copy"><h1>This trail doesn’t go anywhere.</h1><p>The address may have changed. My projects, writing, and photographs are a step back from here.</p><Link className="pill" href="/">Back to home</Link></div>
</div>;}
