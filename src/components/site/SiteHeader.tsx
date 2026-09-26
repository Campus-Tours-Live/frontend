"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type TransitionEvent as ReactTransitionEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { HeaderNav } from "./HeaderNav";
import { MobileNav } from "./MobileNav";
import {
  DesktopSearchShell,
  HeaderSearchMobile,
  TopicSectionPanel,
  UniversitySectionPanel,
} from "./SiteHeaderSearch";
import { useHeaderSearch } from "./useHeaderSearch";

const EXPAND_FOCUS_FALLBACK_MS = 320;

/** Main fixed site header coordinating navigation and responsive search behavior. */
export function SiteHeader({
  showGetStarted = true,
  showAuthActions = true,
  showDashboardLink = true,
}: {
  showGetStarted?: boolean;
  showAuthActions?: boolean;
  
  showDashboardLink?: boolean;
}) {
  const search = useHeaderSearch();
  const {
    collapsed,
    forceExpanded,
    searchFocusWithin,
    pendingFocus,
    setPendingFocus,
    setPanelVisible,
    activeSection,
    endInteraction,
  } = search;

  const headerRef = useRef<HTMLElement>(null);
  const universityInputRef = useRef<HTMLInputElement>(null);
  const topicRef = useRef<HTMLButtonElement>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusActiveSection = useCallback(() => {
    if (activeSection === "topic") topicRef.current?.focus();
    else universityInputRef.current?.focus();
  }, [activeSection]);

  const cancelPendingFocus = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setPendingFocus(false);
  }, [setPendingFocus]);

  useEffect(() => {
    if (!pendingFocus) return;
    fallbackTimerRef.current = setTimeout(() => {
      setPanelVisible(true);
      focusActiveSection();
      setPendingFocus(false);
      fallbackTimerRef.current = null;
    }, EXPAND_FOCUS_FALLBACK_MS);
    return () => {
      if (fallbackTimerRef.current !== null) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [pendingFocus, setPendingFocus, setPanelVisible, focusActiveSection]);

  const handleShellTransitionEnd = (e: ReactTransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "width") return;
    if (!pendingFocus || collapsed) return;
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setPanelVisible(true);
    focusActiveSection();
    setPendingFocus(false);
  };

  useEffect(() => {
    if (!collapsed) return;
    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      headerRef.current?.contains(active) &&
      (active.tagName === "INPUT" ||
        /* istanbul ignore next -- defensive: no <select> exists in the header subtree */
        active.tagName === "SELECT")
    ) {
      active.blur();
    }
  }, [collapsed]);

  useEffect(() => {
    if (!(forceExpanded || activeSection !== null || searchFocusWithin)) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (headerRef.current && target && headerRef.current.contains(target)) return; // inside header
      endInteraction();
      cancelPendingFocus();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const active = document.activeElement as HTMLElement | null;
      if (active && headerRef.current?.contains(active)) active.blur();
      const cancelledSection = activeSection;
      endInteraction();
      cancelPendingFocus();
      if (cancelledSection === "topic") topicRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [forceExpanded, activeSection, searchFocusWithin, endInteraction, cancelPendingFocus]);

  return (
    <>
      <header ref={headerRef} className="fixed inset-x-0 top-0 z-40">
        
        <div className="ds-header-bg" data-collapsed={collapsed} aria-hidden />

        <Container className="relative z-10">
          
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
                  src={assetUrl("logo.svg")}
                  alt="CampusToursLive.ai"
                  width={144}
                  height={36}
                  priority
                  unoptimized
                  className="h-9 w-auto"
                />
              </Link>
            </div>

            
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
        </Container>

        
        <div className="hidden lg:block">
          <DesktopSearchShell
            search={search}
            universityInputRef={universityInputRef}
            topicRef={topicRef}
            onTransitionEnd={handleShellTransitionEnd}
          />
        </div>

        
        <UniversitySectionPanel search={search} />
        <TopicSectionPanel search={search} />
      </header>

      
      <div className="header-spacer" aria-hidden />
    </>
  );
}
