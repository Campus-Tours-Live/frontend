"use client";

import { useEffect, useState } from "react";

function matchesQuery(query: string): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false;
}

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 *
 * SSR- and test-safe: the initial value is read lazily at render (falling back to `false` on the
 * server and in environments without `matchMedia`), and the effect only *subscribes* to changes —
 * it never calls setState on mount, so it triggers no unwrapped updates in tests. Callers should
 * treat `false` as "the default / desktop experience".
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => matchesQuery(query));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
