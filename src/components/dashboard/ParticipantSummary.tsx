import { CalendarDays, Compass, GraduationCap, ShieldCheck, UserRound } from "lucide-react";
import {
  MemberCard,
  SectionHeading,
  type MemberCardHighlight,
  type MemberCardItem,
  type MemberRole,
} from "@/components/ui";
import type { ParticipantDashboard } from "@/lib/data-access";
import { formatMonthYear } from "@/lib/format";
import { dashboardGreeting } from "./utils/greeting";

/**
 * Participant dashboard slice — presentational. The /v1/dashboard aggregate already
 * composed everything (DashboardPage fetches once and branches on `kind`), so this
 * only renders its slice; no data fetching here. Sibling of GuideSummary.
 */
export function ParticipantSummary({ data }: { data: ParticipantDashboard }) {
  const p = data.participant;
  // A parent/guardian participant reads as a Guardian card (purple accent).
  const guardian = p.participantType === "PARENT";
  const role: MemberRole = guardian ? "GUARDIAN" : "PARTICIPANT";

  const items: MemberCardItem[] = [
    { icon: UserRound, label: "Type", value: p.participantType ?? "—" },
    {
      icon: Compass,
      label: "Topics",
      value: p.topicsOfInterest?.length ? `${p.topicsOfInterest.length} selected` : "—",
    },
    {
      icon: GraduationCap,
      label: "Universities",
      value: p.universitiesOfInterest?.length ? `${p.universitiesOfInterest.length} selected` : "—",
    },
    {
      icon: CalendarDays,
      label: "Member since",
      value: formatMonthYear(data.createdAt),
    },
  ];

  const highlight: MemberCardHighlight = guardian
    ? {
        icon: ShieldCheck,
        title: "Guardian consent active",
        description: "You can manage consent and preferences.",
      }
    : {
        icon: Compass,
        title: "Ready to explore",
        description: "Browse live campus tours from verified student guides.",
      };

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionHeading
        level={1}
        titleSize="subhead"
        eyebrow="Participant Dashboard"
        title={dashboardGreeting(p.firstName || p.displayName)}
        lead="Manage your next tour, finish anything that needs attention, and keep exploring."
      />

      <MemberCard
        name={p.displayName ?? "Member"}
        role={role}
        verification={p.email ? "Email Verified" : undefined}
        items={items}
        highlight={highlight}
      />
    </div>
  );
}
