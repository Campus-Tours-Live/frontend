"use client";

import { useEffect, useState } from "react";

/**
 * How many numbered page buttons the tours Pagination should show, adapting to
 * viewport width so mobile isn't forced to fit five: 5 on desktop (≥768px),
 * 4 on small tablets (≥640px), 3 on narrow/mobile. Always within [3, 5].
 *
 * SSR-safe: renders the desktop maximum first, then narrows on the client after
 * the first paint (matchMedia is client-only). Pass the result as Pagination's
 * `windowSize` — the component owns the sliding-window math.
 */
export function useResponsivePageWindow(): number {
  const [size, setSize] = useState(5);

  useEffect(() => {
    const sm = window.matchMedia("(min-width: 640px)");
    const md = window.matchMedia("(min-width: 768px)");
    const sync = () => setSize(md.matches ? 5 : sm.matches ? 4 : 3);
    sync();
    sm.addEventListener("change", sync);
    md.addEventListener("change", sync);
    return () => {
      sm.removeEventListener("change", sync);
      md.removeEventListener("change", sync);
    };
  }, []);

  return size;
}
