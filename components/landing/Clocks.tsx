"use client";
import { useSyncExternalStore } from 'react';

export default function Clocks({ reduced }: { reduced: boolean }) {
  const time = useSyncExternalStore(fn=>{const timer=setInterval(fn,reduced?30000:1000);return()=>clearInterval(timer);},()=>Math.floor(Date.now()/1000)*1000,()=>0);
  const now=new Date(time);
  return <div className="clocks" aria-label="Local times">
    {[['San Francisco', 'America/Los_Angeles'], ['New Delhi', 'Asia/Kolkata']].map(([city, timeZone]) => {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now);
      const value = (type: string) => Number(parts.find(p => p.type === type)?.value || 0);
      const h = value('hour'), m = value('minute'), s = value('second');
      const text = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(now);
      return <div className="clock" key={city}>
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="37" fill="none" stroke="currentColor" strokeWidth=".75" opacity=".65" />
          {Array.from({ length: 12 }, (_, i) => <line key={i} x1="40" y1="5" x2="40" y2={i % 3 ? '8' : '10'} stroke="currentColor" strokeWidth=".7" transform={`rotate(${i * 30} 40 40)`} />)}
          <line x1="40" y1="40" x2="40" y2="21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" transform={`rotate(${h % 12 * 30 + m / 2} 40 40)`} />
          <line x1="40" y1="40" x2="40" y2="12" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" transform={`rotate(${m * 6} 40 40)`} />
          {!reduced && <line x1="40" y1="46" x2="40" y2="10" stroke="var(--sunrise)" strokeWidth=".6" transform={`rotate(${s * 6} 40 40)`} />}
          <circle cx="40" cy="40" r="1.8" fill="currentColor" />
        </svg>
        <span className="clock-city">{city}</span><time suppressHydrationWarning>{text}</time>
      </div>;
    })}
  </div>;
}
