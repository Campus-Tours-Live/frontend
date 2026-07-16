"use client";

import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { useMe } from "@/lib/data-access";
import { Drawer, IconButton, Link, MenuItem } from "@/components/ui";
import { AccountNav } from "./AccountNav";
import { NAV_LINKS } from "./NavLinks";

/**
 * Mobile/medium (<lg) navigation: a left slide-in drawer that overlays the page.
 * The trigger sits to the LEFT of the logo (see SiteHeader). The drawer contains
 * the account menu (when logged in, via AccountNav), the primary site links, and
 * the auth actions. Hidden on lg+ where the inline header nav + left rail apply.
 */
export function MobileNav({
  showAuthActions = true,
}: {
  showAuthActions?: boolean;
  /** Accepted for API symmetry (single sign-in CTA always links to sign-in). */
  showGetStarted?: boolean;
  /** Accepted for API symmetry; the drawer always reflects auth state itself. */
  showDashboard?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { isLoading, isOnboarded } = useMe();

  // Logged-in = you are a member (hold ≥1 role); a not-yet-member (bare account
  // mid first-signup, or not signed in) holds 0 roles → public.
  const loggedIn = isOnboarded;

  return (
    <div className="lg:hidden">
      {/* Negative margin aligns the icon with the page content's left edge. */}
      <IconButton
        a11yLabel="Open menu"
        variant="ghost"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="-ml-[9px] h-10 w-10"
      >
        <Menu size={22} strokeWidth={2} aria-hidden />
      </IconButton>

      {/* Left slide-in drawer (backdrop + Esc + scroll-lock handled by Drawer). */}
      <Drawer open={open} onClose={close} side="left" ariaLabel="Menu">
        {/* Close — floats top-right, no title bar. */}
        <IconButton
          a11yLabel="Close menu"
          variant="ghost"
          onClick={close}
          className="absolute right-2 top-2 z-10"
        >
          <X size={20} strokeWidth={2} aria-hidden />
        </IconButton>

        <div className="flex-1 overflow-y-auto px-3 pb-6 pt-12">
          {/* Logged out (incl. onboarding): welcome card with the sign-in CTA. */}
          {showAuthActions && !isLoading && !loggedIn && (
            <div className="mb-4 rounded-panel bg-primary-soft p-4">
              <Link href="/signin" variant="primary" block onClick={close}>
                Sign in or Join Now
              </Link>
              <p className="mt-2.5 text-center text-[12px] leading-snug text-ink-soft">
                Book live campus tours, or guide your own campus.
              </p>
            </div>
          )}

          {/* Logged in: account menu. */}
          {loggedIn && <AccountNav onNavigate={close} />}

          {/* Primary site links. */}
          <div className="mt-1 border-t border-border pt-3">
            <div className="px-2.5 pb-1.5 text-[12px] font-extrabold uppercase tracking-[0.07em] text-ink-soft">
              Discover
            </div>
            <ul className="flex flex-col gap-0.5">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <MenuItem href={link.href} icon={link.icon} iconSize={17} onSelect={close}>
                    {link.label}
                  </MenuItem>
                </li>
              ))}
            </ul>
          </div>

          {/* Sign out (logged in only). */}
          {showAuthActions && loggedIn && (
            <div className="mt-2 border-t border-border pt-3">
              <MenuItem href="/auth/logout" icon={LogOut} iconSize={17} onSelect={close}>
                Sign out
              </MenuItem>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
