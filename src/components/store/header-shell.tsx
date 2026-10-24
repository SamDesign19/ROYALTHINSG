"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Sticky 64 px header: solid at the top of the page, translucent with backdrop blur once scrolled. */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-[var(--ri-base)]",
        scrolled ? "border-line bg-bg/80 backdrop-blur-xl backdrop-saturate-150" : "border-transparent bg-bg",
      )}
    >
      {children}
    </header>
  );
}
