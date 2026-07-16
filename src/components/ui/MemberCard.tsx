import { type ReactNode } from "react";
import {
  CircleCheck,
  GraduationCap,
  LifeBuoy,
  ShieldCheck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Body } from "./Body";

/**
 * MemberCard — a role-aware member / user-information card (Sam's Club / Airbnb
 * style): avatar + name + role pill, a green verification pill, label→value rows
 * each led by an icon, and an optional accent "highlight" box. No footer / overflow
 * menu.
 *
 * Presentational only. The accent comes from the semantic role tokens
 * (role-participant=blue, role-guide=amber, role-guardian=purple) so it stays in
 * sync with the palette — no raw hex. Staff (admin/support) use a neutral ink accent.
 */
export type MemberRole = "PARTICIPANT" | "GUIDE" | "GUARDIAN" | "ADMIN" | "SUPPORT";

export interface MemberCardItem {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}

export interface MemberCardHighlight {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
}

export interface MemberCardProps {
  name: string;
  role: MemberRole;
  /** Override the default role label (e.g. "Student Guide"). */
  roleLabel?: string;
  /** Trust line shown as a green success pill (e.g. "Email verified"). */
  verification?: ReactNode;
  /** Optional photo; falls back to initials. */
  avatarUrl?: string;
  items?: MemberCardItem[];
  highlight?: MemberCardHighlight;
  className?: string;
}

interface Accent {
  pill: string;
  avatar: string;
  rowIcon: string;
  calloutBox: string;
  roleIcon: LucideIcon;
  label: string;
}

const ACCENT: Record<MemberRole, Accent> = {
  PARTICIPANT: {
    pill: "bg-role-participant-soft text-role-participant-foreground",
    avatar: "bg-role-participant-foreground text-white",
    rowIcon: "text-role-participant-foreground",
    calloutBox: "bg-role-participant-soft",
    roleIcon: User,
    label: "Participant",
  },
  GUIDE: {
    pill: "bg-role-guide-soft text-role-guide-foreground",
    avatar: "bg-role-guide-foreground text-white",
    rowIcon: "text-role-guide-foreground",
    calloutBox: "bg-role-guide-soft",
    roleIcon: GraduationCap,
    label: "Guide",
  },
  GUARDIAN: {
    pill: "bg-role-guardian-soft text-role-guardian-foreground",
    avatar: "bg-role-guardian-foreground text-white",
    rowIcon: "text-role-guardian-foreground",
    calloutBox: "bg-role-guardian-soft",
    roleIcon: Users,
    label: "Guardian",
  },
  ADMIN: {
    pill: "bg-canvas text-ink-soft",
    avatar: "bg-ink text-white",
    rowIcon: "text-ink-soft",
    calloutBox: "bg-canvas",
    roleIcon: ShieldCheck,
    label: "Admin",
  },
  SUPPORT: {
    pill: "bg-canvas text-ink-soft",
    avatar: "bg-ink text-white",
    rowIcon: "text-ink-soft",
    calloutBox: "bg-canvas",
    roleIcon: LifeBuoy,
    label: "Support",
  },
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  /* istanbul ignore next -- ?? is a type-guard; parts[0] is defined when length >= 1 */
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  /* istanbul ignore next -- ?? is a type-guard; the last element is defined here */
  const last = parts[parts.length - 1] ?? "";
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

export function MemberCard({
  name,
  role,
  roleLabel,
  verification,
  avatarUrl,
  items = [],
  highlight,
  className,
}: MemberCardProps) {
  const accent = ACCENT[role];
  const RoleIcon = accent.roleIcon;
  const HighlightIcon = highlight?.icon;
  const initials = initialsOf(name);
  const avatarSize = "h-16 w-16";

  return (
    <section
      className={cn(
        // Clamp width (smaller on large screens) + a floor so content never
        // overflows the card edges when the viewport shrinks.
        "w-full min-w-[368px] max-w-[400px]",
        "rounded-panel border border-border bg-card p-6 shadow-card",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className={cn(avatarSize, "shrink-0 rounded-full object-cover ring-1 ring-border")}
          />
        ) : (
          <div
            className={cn(
              avatarSize,
              "flex shrink-0 items-center justify-center rounded-full font-display text-[20px] font-bold ring-1 ring-border",
              accent.avatar,
            )}
            aria-hidden
          >
            {initials || <User size={26} strokeWidth={1.8} />}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-h3 text-ink">{name}</h2>
          <span
            className={cn(
              "mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-pill px-2.5 py-1 text-left text-[12px] font-bold leading-snug",
              accent.pill,
            )}
          >
            <RoleIcon size={13} strokeWidth={2} aria-hidden />
            {roleLabel ?? accent.label}
          </span>
        </div>
      </div>

      {verification ? (
        <span className="mt-4 inline-flex max-w-full items-center gap-1.5 rounded-pill bg-success-soft px-2.5 py-1 text-left text-[12.5px] font-semibold leading-snug text-success-foreground">
          <CircleCheck size={14} strokeWidth={2} aria-hidden />
          {verification}
        </span>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-5 space-y-3 border-t border-border pt-5">
          {items.map((item) => {
            const RowIcon = item.icon;
            return (
              <li key={item.label} className="flex items-center gap-3 text-[14px]">
                <RowIcon
                  size={18}
                  strokeWidth={1.8}
                  className={cn("shrink-0", accent.rowIcon)}
                  aria-hidden
                />
                <span className="text-ink-soft">{item.label}</span>
                <span className="ml-auto min-w-0 truncate text-right text-ink">{item.value}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {highlight && HighlightIcon ? (
        <div className={cn("mt-5 flex items-center gap-3 rounded-card p-4", accent.calloutBox)}>
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-card",
              accent.rowIcon,
            )}
            aria-hidden
          >
            <HighlightIcon size={20} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <Body weight={600}>{highlight.title}</Body>
            {highlight.description ? (
              <Body size="small" color="muted" className="mt-0.5">
                {highlight.description}
              </Body>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
