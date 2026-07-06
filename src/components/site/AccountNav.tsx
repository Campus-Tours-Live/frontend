"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Clock,
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
import { useMe } from "@/lib/data-access";
import { MenuItem, MenuSection } from "@/components/ui";
import { RoleSwitcher } from "./RoleSwitcher";

/**
 * Role-aware account navigation, shared by the desktop left rail
 * (AccountSidebar) and the mobile drawer (MobileNav). It self-fetches the
 * current user to pick the participant vs guide menu, and renders nothing when
 * logged out.
 *
 * Item destinations are stubbed except Dashboard, Profile, and (for guides) Tour offerings.
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

  // Bare account (no roles) or logged out → render nothing.
  if (!isOnboarded || !me) return null;

  // Active role decides which area's nav we render. Read activeRole (the authoritative
  // UX role) — there is no legacy `role` field on the wire.
  const activeRole: Role = me.activeRole ?? "PARTICIPANT";
  /* istanbul ignore next -- display-name fallbacks; split() always yields an element */
  const name = (me.displayName ?? me.firstName ?? "").split(" ")[0] ?? "";
  const subtitle =
    activeRole === "GUIDE"
      ? me.guideStatus === "PENDING_REVIEW"
        ? "Guide · pending review"
        : "Guide account"
      : "Participant account";

  const groups = activeRole === "GUIDE" ? GUIDE_NAV : PARTICIPANT_NAV;

  return (
    <div>
      {/* Greeting */}
      <div className="border-b border-border px-2.5 pb-5">
        <div className="flex items-center gap-2 font-display text-[20px] font-bold text-ink">
          <span>Hi{name ? `, ${name}` : ""}!</span>
          <Image
            src="/assets/wave-hand.svg"
            alt=""
            width={22}
            height={22}
            unoptimized
            className="inline-block h-[22px] w-[22px]"
          />
        </div>
        <p className="mt-0.5 text-[13px] text-ink-soft">{subtitle}</p>
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
