"use client";

import {
  ChevronDown,
  LayoutDashboard,
  User,
  CircleHelp,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Divider, Link, List, MenuItem } from "@/components/ui";
import { useDropdown } from "@/hooks";
import { useMe } from "@/lib/data-access";
import { submitLogout } from "@/lib/auth/logout";
import { NAV_LINKS } from "./NavLinks";

/**
 * Desktop (lg+) inline navigation.
 *
 * Logged in  → an account item ("Hi, {name}") whose dropdown drops flush from the
 *              header's bottom border and right-aligns to the content edge.
 * Logged out → an "Account" item whose dropdown holds the sign-in CTA + shortcuts.
 *
 * The dropdown shows only shortcuts COMMON to both roles (participant + guide).
 * Those pages require login, so when logged out each item routes through Google
 * sign-in first (`/auth/login?returnTo=<page>`) and lands on the page afterwards.
 *
 * Open/close is handled by useDropdown (hover-intent + Esc); the panel keeps its
 * bespoke positioning (anchored to the header content box).
 */
interface Shortcut {
  label: string;
  icon: LucideIcon;
  href: string;
}

// Common to both the participant and guide side menus.
const COMMON_MENU: Shortcut[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Profile", icon: User, href: "/profile" },
  { label: "Support", icon: CircleHelp, href: "/support" },
];

const PANEL =
  "absolute right-6 top-full z-50 w-56 rounded-card border border-border bg-card p-1.5 shadow-card transition-opacity duration-150";

function loginThen(href: string): string {
  return `/auth/login?intent=signin&returnTo=${encodeURIComponent(href)}`;
}

export function HeaderNav({
  showDashboard = true,
  showAuthActions = true,
}: {
  /** Accepted for API symmetry (the single CTA always links to sign-in). */
  showGetStarted?: boolean;
  showDashboard?: boolean;
  showAuthActions?: boolean;
}) {
  const { me, isLoading, isOnboarded } = useMe();
  const dd = useDropdown();

  // Logged-in = you are a member (hold ≥1 role). A member stays logged-in even while
  // acquiring a SECOND role via the in-app "Become X" onboarding; a not-yet-member
  // (bare account mid first-signup, or not signed in) holds 0 roles → public.
  const loggedIn = isOnboarded;
  /* istanbul ignore next -- display-name fallbacks; split() always yields an element */
  const name = (me?.displayName ?? me?.firstName ?? "").split(" ")[0] ?? "";

  const authedItems = showDashboard
    ? COMMON_MENU
    : COMMON_MENU.filter((m) => m.href !== "/dashboard");

  const panelCls = cn(PANEL, dd.open ? "visible opacity-100" : "invisible opacity-0");

  return (
    <List
      dividers={false}
      className="hidden items-center gap-7 text-ui font-semibold text-ink-soft lg:flex"
    >
      {NAV_LINKS.map((link) => (
        <Link key={link.label} href={link.href} className="transition-colors hover:text-ink">
          {link.label}
        </Link>
      ))}

      {showAuthActions && !isLoading ? (
        <div onMouseEnter={dd.openNow} onMouseLeave={dd.scheduleClose}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={dd.open}
            onClick={dd.toggle}
            className="flex items-center gap-1.5 font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            {loggedIn ? (
              `Hi${name ? `, ${name}` : ""}`
            ) : (
              <>
                <User size={16} strokeWidth={1.8} className="shrink-0" />
                Account
              </>
            )}
            <ChevronDown
              size={14}
              strokeWidth={2}
              className={cn("transition-transform", dd.open && "rotate-180")}
            />
          </button>

          <div role="menu" {...dd.contentProps} className={panelCls}>
            {loggedIn ? (
              <>
                {authedItems.map((it) => (
                  <MenuItem
                    key={it.label}
                    role="menuitem"
                    icon={it.icon}
                    href={it.href}
                    onSelect={dd.close}
                  >
                    {it.label}
                  </MenuItem>
                ))}

                <Divider className="my-1" />

                <MenuItem
                  role="menuitem"
                  icon={LogOut}
                  onSelect={() => {
                    dd.close();
                    submitLogout();
                  }}
                >
                  Sign out
                </MenuItem>
              </>
            ) : (
              <>
                {/* Single sign-in CTA (works for both participants and guides). */}
                <div className="p-2.5">
                  <Link href="/signin" variant="primary" block onClick={dd.close}>
                    Sign in or Join Now
                  </Link>
                </div>

                <Divider className="mx-1 mb-1" />

                {/* Common shortcuts — login-gated, so route through sign-in. */}
                {COMMON_MENU.map((it) => (
                  <MenuItem key={it.label} role="menuitem" icon={it.icon} href={loginThen(it.href)}>
                    {it.label}
                  </MenuItem>
                ))}
              </>
            )}
          </div>
        </div>
      ) : null}
    </List>
  );
}
