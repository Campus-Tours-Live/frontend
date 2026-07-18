import { BadgeCheck, CalendarDays, Clock, GraduationCap, List, Trophy } from "lucide-react";
import {
  Card,
  Link,
  MemberCard,
  type MemberCardHighlight,
  type MemberCardItem,
} from "@/components/ui";
import type { GuideDashboard, GuideProfile } from "@/lib/data-access";
import { formatMonthYear } from "@/lib/format";
import { DashboardHeader } from "./guide/DashboardHeader";

/**
 * Guide dashboard slice — presentational. The /v1/dashboard aggregate composed the
 * profile, application status, `canPublish`, and offerings (DashboardPage fetches
 * once); this renders its slice. Publishing/booking actions are gated server-side on
 * application_status === APPROVED — the highlight box reflects that state. Sibling of
 * ParticipantSummary.
 */

// Counts profile fields as done/total to derive a local completion %. Stats that
// require BFF data (rating, earnings, payout) show "—" until those endpoints land.
function profileCompletionPct(guide: GuideProfile): number {
  const checks = [
    !!guide.firstName,
    !!guide.lastName,
    !!guide.bio,
    (guide.languages?.length ?? 0) > 0,
    (guide.specialties?.length ?? 0) > 0,
    !!guide.basePriceCents,
    guide.verificationStatus === "VERIFIED",
    guide.applicationStatus === "APPROVED",
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

const PLACEHOLDER_STATS = [
  { key: "rating", eyebrow: "Rating", value: "—", sub: "No reviews yet" },
  { key: "month", eyebrow: "This month", value: "—", sub: "Earnings snapshot" },
  { key: "payout", eyebrow: "Upcoming payout", value: "—", sub: "Captured earnings" },
] as const;

export function GuideSummary({ data }: { data: GuideDashboard }) {
  const { guide, guideStatus, canPublish, offerings, createdAt } = data;

  const items: MemberCardItem[] = [
    { icon: GraduationCap, label: "Major", value: guide.major ?? "—" },
    { icon: BadgeCheck, label: "Application", value: guideStatus ?? "—" },
    { icon: List, label: "Offerings", value: String(offerings.length) },
    { icon: CalendarDays, label: "Member since", value: formatMonthYear(createdAt) },
  ];

  const highlight: MemberCardHighlight = canPublish
    ? {
        icon: Trophy,
        title: "Approved to host",
        description: "You can publish offerings and accept bookings.",
      }
    : {
        icon: Clock,
        title: "Application under review",
        description: "Hosting unlocks once an admin approves you.",
      };

  const completionPct = profileCompletionPct(guide);

  return (
    <div className="space-y-6">
      <DashboardHeader firstName={guide.firstName} />

      <MemberCard
        name={guide.displayName ?? "Member"}
        role="GUIDE"
        roleLabel="Student Guide"
        verification={canPublish ? "Identity and University Verified" : undefined}
        items={items}
        highlight={highlight}
      />

      {/* Stats row — rating/earnings/payout show "—" until BFF endpoints land (FE-2 types, BFF-1/4) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Profile completion — first, computed locally from guide profile fields */}
        <Card className="flex flex-col gap-2">
          <p className="eyebrow">Profile</p>
          <p className="font-display text-[28px] font-bold leading-none text-ink">
            {completionPct}%
          </p>
          <div
            className="h-1.5 w-full overflow-hidden rounded-pill bg-border"
            role="progressbar"
            aria-valuenow={completionPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completion"
          >
            <div
              className="h-full rounded-pill bg-primary transition-[width]"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <Link href="/profile" variant="ghost" size="small" className="mt-0.5 self-start px-0">
            Complete profile
          </Link>
        </Card>

        {PLACEHOLDER_STATS.map((s) => (
          <Card key={s.key} className="flex flex-col gap-1">
            <p className="eyebrow">{s.eyebrow}</p>
            <p className="font-display text-[28px] font-bold leading-none text-ink">{s.value}</p>
            <p className="caption mt-0.5">{s.sub}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
