"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Compass,
  List,
  User,
  CreditCard,
  FileSignature,
  ShieldCheck,
  CircleHelp,
  BadgeCheck,
  Star,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";
import { useGuideProfile, useMe } from "@/lib/data-access";
import { Body, Heading, MenuItem, MenuSection } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { RoleSwitcher } from "./RoleSwitcher";

/**
 * Role-aware account navigation, shared by the desktop left rail
 * (AccountSidebar) and the mobile drawer (MobileNav). It self-fetches the
 * current user to pick the participant vs guide menu, and renders nothing when
 * logged out.
 *
 * Item destinations are stubbed except Dashboard, Profile, and (for guides) Availability and
 * Tour offerings.
 * Icons use lucide-react.
 */
export type Role = "PARTICIPANT" | "GUIDE" | "ADMIN" | "SUPPORT";

interface NavItem {
  label: string;
  icon: LucideIcon;
  /** When set the item navigates; otherwise it's a stub (no destination yet). */
  href?: string;
}
interface NavGroup {
  /** Omit for a lead group rendered without a section header (e.g. Dashboard). */
  label?: string;
  items: NavItem[];
}

const PARTICIPANT_NAV: NavGroup[] = [
  {
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" }],
  },
  {
    label: "Tours",
    items: [
      { label: "Explore tours", icon: Compass, href: "/tours" },
      { label: "My bookings", icon: Calendar },
      { label: "Tour history", icon: Clock },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", icon: User, href: "/profile" },
      { label: "Payment methods", icon: CreditCard },
      { label: "Guardian & consent", icon: FileSignature },
    ],
  },
  {
    label: "Help",
    items: [
      { label: "Trust & safety", icon: ShieldCheck },
      { label: "Support", icon: CircleHelp },
    ],
  },
];

const GUIDE_NAV: NavGroup[] = [
  {
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" }],
  },
  {
    label: "Tours",
    items: [
      { label: "Explore tours", icon: Compass, href: "/tours" },
      { label: "Upcoming tours", icon: Calendar },
      { label: "Availability", icon: Clock, href: "/guide/availability" },
      { label: "Tour offerings", icon: List, href: "/guide/tour-offerings" },
    ],
  },
  {
    label: "Earnings",
    items: [{ label: "Earnings", icon: CircleDollarSign }],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", icon: User, href: "/profile" },
      { label: "Verification", icon: BadgeCheck },
      { label: "Reviews", icon: Star },
    ],
  },
  {
    label: "Help",
    items: [
      { label: "Trust & safety", icon: ShieldCheck },
      { label: "Support", icon: CircleHelp },
    ],
  },
];

export function AccountNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { me, isOnboarded } = useMe();
  // Only fetch the guide profile when it's actually needed (the subtitle below) — a
  // participant-context render never issues this call. Called unconditionally (before the
  // render-gate return) per the rules of hooks; `enabled` does the actual gating.
  const { data: guideProfile } = useGuideProfile(me?.currentRole === "GUIDE");

  // Bare account (no roles) or logged out → render nothing.
  if (!isOnboarded || !me) return null;

  // Active role decides which area's nav we render. Read currentRole (the authoritative
  // UX role) — there is no legacy `role` field on the wire.
  const currentRole: Role = me.currentRole ?? "PARTICIPANT";
  /* istanbul ignore next -- display-name fallbacks; split() always yields an element */
  const name = (me.user.displayName ?? me.user.firstName ?? "").split(" ")[0] ?? "";
  // While the guide profile is still loading, `guideProfile` is undefined, which reads as
  // not-pending — the same safe default the rest of the app uses for an unresolved status.
  const subtitle =
    currentRole === "GUIDE"
      ? guideProfile?.guideStatus === "PENDING"
        ? "Guide · pending verification"
        : "Guide account"
      : "Participant account";

  const groups = currentRole === "GUIDE" ? GUIDE_NAV : PARTICIPANT_NAV;

  return (
    <div>
      {/* Greeting */}
      <div className="border-b border-border px-2.5 pb-5">
        <Heading as="div" size="large" className="flex items-center gap-2">
          <span>Hi{name ? `, ${name}` : ""}!</span>
          <Image
            src={assetUrl("wave_hand.svg")}
            alt=""
            width={22}
            height={22}
            unoptimized
            className="inline-block h-[22px] w-[22px]"
          />
        </Heading>
        <Body size="small" color="muted" className="mt-0.5">
          {subtitle}
        </Body>
      </div>

      {/* Switch active role / start a second role's onboarding */}
      <RoleSwitcher onNavigate={onNavigate} />

      {/* Groups */}
      <nav>
        {groups.map((group, gi) => (
          <MenuSection key={group.label ?? `group-${gi}`} label={group.label} bordered={gi > 0}>
            {group.items.map((item) => (
              <li key={item.label}>
                <MenuItem
                  variant="pill"
                  icon={item.icon}
                  href={item.href}
                  active={
                    Boolean(item.href) &&
                    (pathname === item.href || pathname.startsWith(`${item.href}/`))
                  }
                  onSelect={onNavigate}
                >
                  {item.label}
                </MenuItem>
              </li>
            ))}
          </MenuSection>
        ))}
      </nav>
    </div>
  );
}
