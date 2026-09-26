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

/** Renders the participant portion of the dashboard. */
export function ParticipantSummary({ data }: { data: ParticipantDashboard }) {
  const { me } = useMe();
  const participant = data.participant;
  const isGuardian = participant.type === "PARENT";
  const role: MemberRole = isGuardian ? "GUARDIAN" : "PARTICIPANT";

  const items: MemberCardItem[] = [
    { icon: UserRound, label: "Type", value: participant.type ?? "—" },
    {
      icon: Compass,
      label: "Topics",
      value: participant.topicsOfInterest?.length
        ? `${participant.topicsOfInterest.length} selected`
        : "—",
    },
    {
      icon: GraduationCap,
      label: "Universities",
      value: participant.universitiesOfInterest?.length
        ? `${participant.universitiesOfInterest.length} selected`
        : "—",
    },
    { icon: CalendarDays, label: "Member since", value: formatMonthYear(data.createdAt) },
  ];

  const highlight: MemberCardHighlight = isGuardian
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
    </div>
  );
}
