"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type TransitionEvent as ReactTransitionEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { HeaderNav } from "./HeaderNav";
import { MobileNav } from "./MobileNav";
import { HeaderSearchBar, HeaderSearchMobile, HeaderSearchPill } from "./SiteHeaderSearch";
import { useHeaderSearch } from "./useHeaderSearch";

/** Fallback delay for focusing University after a compact-search click, used when the band's
 *  transform `transitionend` doesn't fire (reduced motion / interrupted transition). */
const EXPAND_FOCUS_FALLBACK_MS = 320;

/**
 * SiteHeader — fixed, Airbnb-style collapsing header (uniform on every desktop page).
 *
 * Layout strategy (deliberate): the fixed header is a single constant-height row, and the
 * expanded search sits in an ABSOLUTE overlay band below it. The band is never in document flow,
 * so expanding/collapsing it cannot change page height, push content, or move scrollY — the
 * `.header-spacer` reserves only the row height and never animates. This is what keeps content
 * from jumping (and keeps the collapse from feeding back into the scroll hook). The trade-off is
 * that at the very top of a page the open band overlays the first ~80px of content (the header
 * zone); that is intentional.
 *
 * The DOM refs and effects (release `forceExpanded` / close suggestions on a genuine outside
 * pointer-down or Escape; focus University after the band's expand transition, with cancellation
 * on any intent to stop editing) live here — `useHeaderSearch` stays DOM-free.
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
    setUniFocused,
    pendingFocus,
    setPendingFocus,
  } = search;

  const headerRef = useRef<HTMLElement>(null);
  const universityInputRef = useRef<HTMLInputElement>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingFocus = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setPendingFocus(false);
  }, [setPendingFocus]);

  // Fallback: focus University a beat after a compact-search click even if the transition never
  // fires transitionend. The transition handler below cancels this the moment it does fire.
  useEffect(() => {
    if (!pendingFocus) return;
    fallbackTimerRef.current = setTimeout(() => {
      universityInputRef.current?.focus();
      setPendingFocus(false);
      fallbackTimerRef.current = null;
    }, EXPAND_FOCUS_FALLBACK_MS);
    return () => {
      if (fallbackTimerRef.current !== null) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [pendingFocus, setPendingFocus]);

  // Focus University only when the band's OWN transform transition finishes while expanding —
  // not on the shorter opacity transition, and not on a child element's transition bubbling up.
  const handleBandTransitionEnd = (e: ReactTransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "transform") return;
    if (!pendingFocus || collapsed) return;
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    universityInputRef.current?.focus();
    setPendingFocus(false);
  };

  // Genuine outside pointer-down / Escape ends the search interaction. Active whenever the search
  // is engaged (forced open, focused, or suggestions open) so Escape also works when the band was
  // opened by focusing University at the top of the page — not only after a compact-pill click.
  useEffect(() => {
    if (!(forceExpanded || uniFocused || searchFocusWithin)) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      // Clicks inside the header (e.g. moving between University → Topic) never end the interaction.
      if (headerRef.current && target && headerRef.current.contains(target)) return;
      setForceExpanded(false);
      cancelPendingFocus();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setUniFocused(false);
      const active = document.activeElement as HTMLElement | null;
      if (active && headerRef.current?.contains(active)) active.blur();
      setForceExpanded(false);
      cancelPendingFocus();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [
    forceExpanded,
    uniFocused,
    searchFocusWithin,
    setForceExpanded,
    setUniFocused,
    cancelPendingFocus,
  ]);

  return (
    <>
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-card"
      >
        <div className="mx-auto max-w-content px-6">
          {/* The one, constant-height header row: logo | search slot | nav. */}
          <div className="grid h-[var(--header-row-height)] grid-cols-[auto_1fr_auto] items-center gap-4">
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

            {/* Center: desktop compact pill (cross-fades) + mobile pill (always). */}
            <div className="flex min-w-0 justify-center">
              <div
                className="header-compact hidden w-full max-w-sm lg:block"
                data-hidden={!collapsed}
                inert={!collapsed}
              >
                <HeaderSearchPill search={search} hidden={!collapsed} />
              </div>
              <HeaderSearchMobile search={search} />
            </div>

            <nav className="flex items-center gap-7">
              <HeaderNav
                showAuthActions={showAuthActions}
                showGetStarted={showGetStarted}
                showDashboard={showDashboardLink}
              />
            </nav>
          </div>
        </div>

        {/* Expanded search band — an OVERLAY below the row (absolute; never in flow). Fades +
            retracts on collapse; nothing here changes document layout. */}
        <div
          className="header-band absolute inset-x-0 top-full hidden border-b border-border/70 bg-card shadow-md lg:block"
          data-collapsed={collapsed}
          aria-hidden={collapsed}
          inert={collapsed}
          onTransitionEnd={handleBandTransitionEnd}
        >
          <div className="mx-auto flex max-w-content justify-center px-6 pb-4 pt-2">
            <HeaderSearchBar search={search} universityInputRef={universityInputRef} />
          </div>
        </div>
      </header>

      {/* Reserves only the fixed row's height, and never animates — content never jumps. */}
      <div className="header-spacer" aria-hidden />
    </>
  );
}
