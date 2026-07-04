import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { HeaderNav } from "./HeaderNav";
import { MobileNav } from "./MobileNav";

/**
 * SiteHeader — top product header from CampusToursLive-design_new.html (#home).
 * Links and CTAs are intentionally inert placeholders for now.
 * Brand logo asset: save it to `public/assets/logo.svg`.
 *
 * `showGetStarted` is false on the signup flow itself (e.g. /signup/role) so the
 * primary CTA doesn't loop the user back to the page they're already on.
 *
 * This stays a Server Component; the nav links (which carry icon components) are
 * imported directly by the client nav components, not passed as props.
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
  return (
    <header className="border-b border-border/70">
      <div className="relative mx-auto flex max-w-content items-center justify-between gap-4 px-6 py-4">
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

        {/* Search — sits between the logo and the nav at every width.
            min-w-0 lets it shrink (instead of squeezing the logo) on narrow screens. */}
        <div className="search flex min-w-0 max-w-sm flex-1">
          <input
            type="text"
            inputMode="search"
            aria-label="Search tours"
            placeholder="Search universities, tours, or topics"
          />
          <button
            type="button"
            aria-label="Search"
            className="flex shrink-0 items-center rounded-pill text-ink-soft outline-none focus-visible:ring-2 focus-visible:ring-primary-soft"
          >
            <Search size={18} strokeWidth={2} aria-hidden />
          </button>
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
    </header>
  );
}
