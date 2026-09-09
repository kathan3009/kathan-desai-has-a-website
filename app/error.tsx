"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="simple-error"><h2>Something didn’t load.</h2><p>Please try again. Your reading preferences and site content haven’t changed.</p><button onClick={reset}>Try again</button></div>;}
