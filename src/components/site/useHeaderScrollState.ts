"use client";

import { useEffect, useRef, useState } from "react";

export type ScrollDirection = "up" | "down" | "idle";

export interface UseHeaderScrollStateOptions {
  /** At or below this scrollY the header always wants to be expanded. */
  topThreshold?: number;
  /** Collapsing is only considered once past this scrollY. */
  collapseThreshold?: number;
  /** Accumulated downward distance (px) required before collapsing. */
  downDistance?: number;
  /** Accumulated upward distance (px) required before expanding. */
  upDistance?: number;
}

export interface HeaderScrollState {
  /** Scroll *intent* only — whether scrolling alone wants the header collapsed. The final
   *  decision (interaction locks etc.) is composed by the caller, not here. */
  isCollapsed: boolean;
  scrollDirection: ScrollDirection;
}

/**
 * useHeaderScrollState — direction + accumulated-distance scroll intent for the collapsing
 * header. Deliberately decoupled from any search UI: it reports only whether *scrolling*
 * wants the header collapsed; the caller ANDs that with its own interaction locks.
 *
 * Rules (Airbnb-style, tuned to avoid threshold flicker):
 *  - scrollY ≤ topThreshold                        → expand (and reset accumulation)
 *  - scrolling down, past collapseThreshold, and
 *    accumulated down distance ≥ downDistance       → collapse
 *  - scrolling up and accumulated up ≥ upDistance   → expand
 *  - direction reversal resets the accumulator
 *  - deltas < 1px are ignored (trackpad jitter)
 *
 * Reads are coalesced through requestAnimationFrame; the listener is passive; iOS rubber-band
 * (negative scrollY) is clamped. SSR-safe: nothing touches `window` during render.
 */
export function useHeaderScrollState({
  topThreshold = 24,
  collapseThreshold = 80,
  downDistance = 20,
  upDistance = 12,
}: UseHeaderScrollStateOptions = {}): HeaderScrollState {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>("idle");

  const previousYRef = useRef(0);
  const accumulatedDeltaRef = useRef(0);
  const previousDirectionRef = useRef<ScrollDirection>("idle");
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    previousYRef.current = Math.max(window.scrollY, 0);

    const update = () => {
      frameRef.current = null;

      const currentY = Math.max(window.scrollY, 0);
      const delta = currentY - previousYRef.current;

      if (Math.abs(delta) < 1) {
        // Still honour the top threshold even on sub-pixel settling at the top.
        if (currentY <= topThreshold) {
          setIsCollapsed(false);
          accumulatedDeltaRef.current = 0;
        }
        previousYRef.current = currentY;
        return;
      }

      const direction: ScrollDirection = delta > 0 ? "down" : "up";

      if (direction !== previousDirectionRef.current) {
        accumulatedDeltaRef.current = 0;
        previousDirectionRef.current = direction;
      }

      accumulatedDeltaRef.current += Math.abs(delta);
      setScrollDirection(direction);

      if (currentY <= topThreshold) {
        setIsCollapsed(false);
        accumulatedDeltaRef.current = 0;
      } else if (
        direction === "down" &&
        currentY > collapseThreshold &&
        accumulatedDeltaRef.current >= downDistance
      ) {
        setIsCollapsed(true);
        accumulatedDeltaRef.current = 0;
      } else if (direction === "up" && accumulatedDeltaRef.current >= upDistance) {
        setIsCollapsed(false);
        accumulatedDeltaRef.current = 0;
      }

      previousYRef.current = currentY;
    };

    const onScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(update);
    };

    // Evaluate once on mount so a page loaded mid-scroll starts in the right state.
    update();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [topThreshold, collapseThreshold, downDistance, upDistance]);

  return { isCollapsed, scrollDirection };
}
