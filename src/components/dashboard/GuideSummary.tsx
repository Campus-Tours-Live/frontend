import { BadgeCheck, CalendarDays, Clock, GraduationCap, List, Trophy } from "lucide-react";
import {
  Button,
  MemberCard,
  SectionHeading,
  type MemberCardHighlight,
  type MemberCardItem,
} from "@/components/ui";
import type { GuideDashboard } from "@/lib/data-access";
import { formatMonthYear } from "@/lib/format";
import { dashboardGreeting } from "./utils/greeting";

/**
 * Guide dashboard slice — presentational. The /v1/dashboard aggregate composed the
 * profile, application status, `canPublish`, and offerings (DashboardPage fetches
 * once); this renders its slice. Publishing/booking actions are gated server-side on
 * application_status === APPROVED — the highlight box reflects that state. Sibling of
 * ParticipantSummary.
 */
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

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionHeading
        level={1}
        titleSize="subhead"
        eyebrow="Guide Dashboard"
        title={dashboardGreeting(guide.firstName || guide.displayName)}
        lead="Review booking requests, prepare for today's tours, and keep your guide profile ready."
      />
      <div className="flex justify-end">
        <Button variant="secondary" size="sm">
          Edit Availability
        </Button>
      </div>
      <MemberCard
        name={guide.displayName ?? "Member"}
        role="GUIDE"
        roleLabel="Student Guide"
        verification={canPublish ? "Identity and University Verified" : undefined}
        items={items}
        highlight={highlight}
      />
    </div>
  );
}
