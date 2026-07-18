"use client";

import { useEffect, useState } from "react";

/**
 * True once the page is scrolled past `threshold` px, or immediately when `forceCollapsed`
 * (e.g. on /tours the header search is always the compact pill). Drives the header search's
 * expanded ↔ compact transition.
 */
export function useHeaderSearchCollapse(threshold = 80, forceCollapsed = false): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (forceCollapsed) return;
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, forceCollapsed]);

  return forceCollapsed || scrolled;
}
