import { CalendarDays, Compass, GraduationCap, ShieldCheck, UserRound } from "lucide-react";
import {
  MemberCard,
  SectionHeading,
  type MemberCardHighlight,
  type MemberCardItem,
  type MemberRole,
} from "@/components/ui";
import { useMe, type ParticipantDashboard } from "@/lib/data-access";
import { formatMonthYear } from "@/lib/format";
import { ParticipantHistory } from "./ParticipantHistory";

/**
 * Participant dashboard slice — presentational. The /v1/dashboard aggregate already
 * composed everything (DashboardPage fetches once and branches on `kind`), so this
 * only renders its slice; no data fetching here. Sibling of GuideSummary.
 */
export function ParticipantSummary({ data }: { data: ParticipantDashboard }) {
  const { me } = useMe();
  const p = data.participant;
  // A parent/guardian participant reads as a Guardian card (purple accent).
  const guardian = p.type === "PARENT";
  const role: MemberRole = guardian ? "GUARDIAN" : "PARTICIPANT";

  const items: MemberCardItem[] = [
    { icon: UserRound, label: "Type", value: p.type ?? "—" },
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
    <div>
      <SectionHeading
        eyebrow="Dashboard"
        title={`Welcome${me?.user.displayName ? `, ${me.user.displayName}` : ""}.`}
        lead="Your participant profile is saved."
      />

      <MemberCard
        className="mt-8"
        name={me?.user.displayName ?? "Member"}
        role={role}
        verification={me?.user.email ? "Email Verified" : undefined}
        items={items}
        highlight={highlight}
      />

      <div className="mt-10">
        <ParticipantHistory />
      </div>
    </div>
  );
}
