"use client";

import { useEffect, useRef, useState } from "react";

export type ScrollDirection = "up" | "down" | "idle";

export interface UseHeaderScrollStateOptions {
  /** When false the hook does no work and always reports expanded (e.g. below the desktop
   *  breakpoint, where the collapse UI isn't shown). */
  enabled?: boolean;
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
 * Rules (tuned to avoid threshold flicker):
 *  - scrollY ≤ topThreshold                        → expand (and reset accumulation)
 *  - scrolling down, past collapseThreshold, and
 *    accumulated down distance ≥ downDistance       → collapse
 *  - scrolling up and accumulated up ≥ upDistance   → expand
 *  - direction reversal resets the accumulator
 *  - deltas < 1px are ignored (trackpad jitter)
 *
 * On mount it seeds from the current scrollY, so a page loaded already scrolled past
 * `collapseThreshold` starts collapsed. Reads are coalesced through requestAnimationFrame; the
 * listener is passive; iOS rubber-band (negative scrollY) is clamped. Disabled (mobile) it
 * attaches no listener. SSR-safe: nothing touches `window` during render.
 *
 * NOTE: this reports scroll intent only. It does not know whether a layout change (e.g. a header
 * that resizes and pushes content) moved the page — callers must not let the header's own
 * collapse alter document height, or the resulting scroll would feed back into this hook.
 */
export function useHeaderScrollState({
  enabled = true,
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
    // Seeding collapse state from the live scroll position is exactly this effect's job (scrollY
    // isn't available during SSR render, so it can't move to a useState initializer).
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!enabled) {
      setIsCollapsed(false);
      setScrollDirection("idle");
      return;
    }

    const startY = Math.max(window.scrollY, 0);
    previousYRef.current = startY;
    accumulatedDeltaRef.current = 0;
    previousDirectionRef.current = "idle";
    // Seed from the load position so a mid-scroll refresh starts collapsed.
    setIsCollapsed(startY > collapseThreshold);
    /* eslint-enable react-hooks/set-state-in-effect */

    const update = () => {
      frameRef.current = null;

      const currentY = Math.max(window.scrollY, 0);
      const delta = currentY - previousYRef.current;

      if (Math.abs(delta) < 1) {
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

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [enabled, topThreshold, collapseThreshold, downDistance, upDistance]);

  return { isCollapsed, scrollDirection };
}
