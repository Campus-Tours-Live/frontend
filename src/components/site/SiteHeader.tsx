"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { HeaderNav } from "./HeaderNav";
import { MobileNav } from "./MobileNav";
import { HeaderSearchBar, HeaderSearchMobile, HeaderSearchPill } from "./SiteHeaderSearch";
import { useHeaderSearch } from "./useHeaderSearch";

/** Fallback delay for focusing University after a compact-search click, when the band's
 *  `transitionend` doesn't fire (reduced motion / overridden transition). */
const EXPAND_FOCUS_FALLBACK_MS = 320;

/**
 * SiteHeader — fixed, two-tier, Airbnb-style collapsing header (uniform on every page).
 *
 *  - Row 1 (always, fixed `--header-row-height`): logo | search slot | nav. The slot holds the
 *    desktop compact pill (cross-fades in while collapsed) and the mobile pill (always).
 *  - Row 2 (desktop only): the expanded search band; scroll intent + interaction locks (from
 *    `useHeaderSearch`) decide whether it's open. Height + padding + opacity + offset animate
 *    together; a sibling `.header-spacer` reserves the fixed header's height and animates with it,
 *    so page content moves smoothly and is never overlapped.
 *
 * The DOM refs and the two DOM effects (release `forceExpanded` on a genuine outside pointer-down /
 * Escape; focus University once the band has expanded) live here — `useHeaderSearch` stays DOM-free.
 */
export function SiteHeader({
  showGetStarted = true,
  showAuthActions = true,
  showDashboardLink = true,
}: {
  showGetStarted?: boolean;
  showAuthActions?: boolean;
  /** Hide the Dashboard link in the header (e.g. on the dashboard itself). */
  showDashboardLink?: boolean;
}) {
  const search = useHeaderSearch();
  const {
    collapsed,
    forceExpanded,
    setForceExpanded,
    searchFocusWithin,
    uniFocused,
    pendingFocus,
    setPendingFocus,
  } = search;

  const headerRef = useRef<HTMLElement>(null);
  const universityInputRef = useRef<HTMLInputElement>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus University once the band has expanded — fallback timer covers reduced-motion / no
  // transitionend; `onBandTransitionEnd` fires it sooner when the animation actually runs.
  useEffect(() => {
    if (!pendingFocus) return;
    const focus = () => {
      universityInputRef.current?.focus();
      setPendingFocus(false);
    };
    fallbackTimerRef.current = setTimeout(focus, EXPAND_FOCUS_FALLBACK_MS);
    return () => {
      if (fallbackTimerRef.current !== null) clearTimeout(fallbackTimerRef.current);
    };
  }, [pendingFocus, setPendingFocus]);

  const handleBandTransitionEnd = () => {
    if (!pendingFocus) return;
    if (fallbackTimerRef.current !== null) clearTimeout(fallbackTimerRef.current);
    universityInputRef.current?.focus();
    setPendingFocus(false);
  };

  // Release forceExpanded only on a genuine outside pointer-down / Escape, and not while the search
  // area is still focused or the suggestions are open (so moving between header controls doesn't
  // clear it).
  useEffect(() => {
    if (!forceExpanded) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (headerRef.current && target && headerRef.current.contains(target)) return;
      if (searchFocusWithin || uniFocused) return;
      setForceExpanded(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const active = document.activeElement as HTMLElement | null;
      if (active && headerRef.current?.contains(active)) active.blur();
      setForceExpanded(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [forceExpanded, searchFocusWithin, uniFocused, setForceExpanded]);

  return (
    <>
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-card"
      >
        <div className="mx-auto max-w-content px-6">
          {/* Row 1: logo | search slot | nav — fixed height so the header total is deterministic. */}
          <div className="grid h-[var(--header-row-height)] grid-cols-[auto_1fr_auto] items-center gap-4">
            {/* Left cluster: hamburger (mobile/medium, left of the logo) + brand. */}
            <div className="flex shrink-0 items-center gap-2">
              <MobileNav
                showAuthActions={showAuthActions}
                showGetStarted={showGetStarted}
                showDashboard={showDashboardLink}
              />
              <Link
                href="/"
                className="flex shrink-0 items-center"
                aria-label="CampusToursLive.ai home"
              >
                <Image
                  src="/assets/logo.svg"
                  alt="CampusToursLive.ai"
                  width={144}
                  height={36}
                  priority
                  unoptimized
                  className="h-9 w-auto"
                />
              </Link>
            </div>

            {/* Center search slot: desktop compact pill (cross-fades) + mobile pill (always). */}
            <div className="flex min-w-0 justify-center">
              <div
                className="header-compact hidden w-full max-w-sm lg:block"
                data-hidden={!collapsed}
                inert={!collapsed}
                aria-hidden={!collapsed}
              >
                <HeaderSearchPill search={search} />
              </div>
              <HeaderSearchMobile search={search} />
            </div>

            {/* Inline nav + auth actions (lg+). On smaller screens these live in the drawer. */}
            <nav className="flex items-center gap-7">
              <HeaderNav
                showAuthActions={showAuthActions}
                showGetStarted={showGetStarted}
                showDashboard={showDashboardLink}
              />
            </nav>
          </div>

          {/* Row 2: expanded search band (desktop only). */}
          <div
            className="header-band hidden lg:block"
            data-collapsed={collapsed}
            aria-hidden={collapsed}
            inert={collapsed}
            onTransitionEnd={handleBandTransitionEnd}
          >
            <div className="flex justify-center">
              <HeaderSearchBar search={search} universityInputRef={universityInputRef} />
            </div>
          </div>
        </div>
      </header>

      {/* Reserves the fixed header's current height and animates in lockstep with it. */}
      <div className="header-spacer" data-collapsed={collapsed} aria-hidden />
    </>
  );
}
