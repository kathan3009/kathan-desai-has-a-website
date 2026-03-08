"use client";

import { useEffect, useRef } from "react";

export function BlogViewTracker({ slug }: { slug: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    fetch(`/api/blog/${slug}/view`, { method: "POST" }).catch(() => {});
  }, [slug]);

  return null;
}
