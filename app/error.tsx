"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="simple-error"><div className="error-copy" style={{paddingTop:'12vh'}}><h2>Something didn’t load.</h2><p>Please try again. Your reading preferences and site content haven’t changed.</p><button className="pill" onClick={reset}>Try again</button></div></div>;}
