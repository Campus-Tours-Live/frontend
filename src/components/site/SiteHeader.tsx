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
import { DesktopSearchShell, HeaderSearchMobile } from "./SiteHeaderSearch";
import { useHeaderSearch } from "./useHeaderSearch";

/** Fallback delay for focusing University after a compact-search click, used when the shell's
 *  width `transitionend` doesn't fire (reduced motion / interrupted transition). */
const EXPAND_FOCUS_FALLBACK_MS = 320;

/**
 * SiteHeader — fixed, Airbnb-style collapsing header. STEP 1 of the morph rework: the desktop
 * search is a single `.ds-shell` whose geometry morphs between expanded and compact (one DOM node;
 * the expanded form and the compact "Edit search" button cross-fade inside it). The shell lives in
 * a motion layer that is a SIBLING of the row grid and is positioned relative to this fixed header,
 * so it never changes containing block. The band is an overlay (constant 72px spacer, no layout
 * shift). The three-state top-expanded/scroll-expanded page safe-area is a later step; for now the
 * shell always overlays.
 *
 * DOM refs + effects (outside pointer-down / Escape end the interaction and cancel pending focus;
 * focus University once the shell's width transition finishes; defensive blur if focus is somehow
 * inside the expanded form when it collapses) live here — `useHeaderSearch` stays DOM-free.
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

  // Focus University only when the shell's OWN width transition finishes while expanding — so focus
  // lands once the shell has reached a usable size, not at 0ms and not on a child's transition.
  const handleShellTransitionEnd = (e: ReactTransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "width") return;
    if (!pendingFocus || collapsed) return;
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    universityInputRef.current?.focus();
    setPendingFocus(false);
  };

  // Defensive: never leave focus inside the expanded form once it collapses (the focus lock should
  // already prevent this, but a race must not strand focus in an inert/aria-hidden node).
  useEffect(() => {
    if (!collapsed) return;
    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      headerRef.current?.contains(active) &&
      (active.tagName === "INPUT" || active.tagName === "SELECT")
    ) {
      active.blur();
    }
  }, [collapsed]);

  // Genuine outside pointer-down / Escape ends the search interaction. Active whenever the search is
  // engaged so Escape also works when the band was opened by focusing University at the top of the
  // page — not only after a compact-pill click.
  useEffect(() => {
    if (!(forceExpanded || uniFocused || searchFocusWithin)) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (headerRef.current && target && headerRef.current.contains(target)) return; // inside header
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
          {/* Constant-height row: logo | (mobile search / empty on desktop) | nav. */}
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

            {/* Center: mobile search only (desktop shell overlays via the motion layer below). */}
            <div className="flex min-w-0 justify-center">
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

        {/* Desktop single-shell search — motion layer (sibling of the row), centered to the header.
            The shell is absolute; this wrapper is static so the shell's containing block is <header>. */}
        <div className="hidden lg:block">
          <DesktopSearchShell
            search={search}
            universityInputRef={universityInputRef}
            onTransitionEnd={handleShellTransitionEnd}
          />
        </div>
      </header>

      {/* Reserves only the fixed row's height, and never animates — content never jumps. */}
      <div className="header-spacer" aria-hidden />
    </>
  );
}
