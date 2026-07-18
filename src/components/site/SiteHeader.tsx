import Image from "next/image";
import Link from "next/link";
import { HeaderNav } from "./HeaderNav";
import { MobileNav } from "./MobileNav";
import { SiteHeaderSearch } from "./SiteHeaderSearch";

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

        {/* Global search — the single search entry point (see SiteHeaderSearch). */}
        <SiteHeaderSearch />

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
