"use client";

import { useState, useEffect } from "react";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function TimeGreeting() {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tight">
      {greeting ? `${greeting},` : "Hi,"}<br />
      I'm Kathan.
    </h1>
  );
}
