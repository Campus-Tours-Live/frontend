"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HeaderNav } from "./HeaderNav";
import { MobileNav } from "./MobileNav";
import { HeaderSearchBar, HeaderSearchMobile, HeaderSearchPill } from "./SiteHeaderSearch";
import { useHeaderSearch } from "./useHeaderSearch";

/**
 * SiteHeader — top product header from CampusToursLive-design_new.html (#home).
 * Links and CTAs are intentionally inert placeholders for now.
 * Brand logo asset: save it to `public/assets/logo.svg`.
 *
 * `showGetStarted` is false on the signup flow itself (e.g. /signup/role) so the
 * primary CTA doesn't loop the user back to the page they're already on.
 *
 * Two-tier, scroll-collapse search layout (Airbnb-style), uniform on every page:
 *  - Row 1 is the nav row (logo | search slot | nav links), always visible, sticky.
 *  - Row 2 is a band below row 1 that holds the expanded search bar. At the top of any
 *    page it's shown by default; past `threshold`px of scroll it animates to zero height
 *    and the compact pill appears in row 1 instead. Clicking the pill re-expands the band.
 * `useHeaderSearch()` owns all of that state so the pill (row 1) and the band (row 2) act
 * as a single control despite living in different DOM rows.
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

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card">
      <div className="mx-auto max-w-content px-6">
        {/* Row 1: logo | search slot (desktop pill when collapsed, mobile pill always) | nav */}
        <div className="relative flex items-center justify-between gap-4 py-3">
          {/* Left cluster: hamburger (mobile/medium, left of the logo) + brand. */}
          <div className="flex shrink-0 items-center gap-2">
            <MobileNav
              showAuthActions={showAuthActions}
              showGetStarted={showGetStarted}
              showDashboard={showDashboardLink}
            />
            {/* Brand — always navigates home. logo.svg is a wide (~4:1) lockup.
                shrink-0 keeps it from being compressed by the flexible search box. */}
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

          {/* Desktop: compact pill, centered between logo and nav, only while collapsed. */}
          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            {search.collapsed ? <HeaderSearchPill search={search} /> : null}
          </div>

          {/* Mobile: always-compact pill that opens the full-screen search sheet. */}
          <HeaderSearchMobile search={search} />

          {/* Inline nav + auth actions (lg+). On smaller screens these live in the drawer. */}
          <nav className="flex items-center gap-7">
            <HeaderNav
              showAuthActions={showAuthActions}
              showGetStarted={showGetStarted}
              showDashboard={showDashboardLink}
            />
          </nav>
        </div>

        {/* Row 2: expanded search band (desktop only). Animates height + opacity on collapse. */}
        <div
          className={cn(
            "hidden overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none lg:grid",
            search.collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] pb-4 opacity-100",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex justify-center">
              <HeaderSearchBar search={search} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
