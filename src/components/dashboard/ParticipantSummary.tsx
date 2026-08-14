"use client";

import { CalendarDays, Compass, GraduationCap, ShieldCheck, UserRound } from "lucide-react";
import {
  Link,
  MemberCard,
  SectionHeading,
  type MemberCardHighlight,
  type MemberCardItem,
  type MemberRole,
} from "@/components/ui";
import { useMe, type ParticipantDashboard } from "@/lib/data-access";
import { formatMonthYear } from "@/lib/format";
import { RecommendedTours } from "./RecommendedTours";

/**
 * Participant dashboard — welcome header, profile member card, and recommended
 * tours strip. The /v1/dashboard aggregate is fetched once in DashboardPage and
 * forwarded here; future sections (bookings, pending actions) will use it too.
 */
export function ParticipantSummary({ data }: { data: ParticipantDashboard }) {
  const { me } = useMe();
  const p = data.participant;
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
    { icon: CalendarDays, label: "Member since", value: formatMonthYear(data.createdAt) },
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
    <div className="flex flex-col gap-12">
      <SectionHeading
        eyebrow="Participant Dashboard"
        title={`Welcome back${me?.user.displayName ? `, ${me.user.displayName}` : ""}.`}
        lead="Manage your next tour, find anything that needs attention, and keep exploring."
        level={1}
        action={
          <Link href="/tours" variant="primary" className="shrink-0">
            Find a Tour
          </Link>
        }
      />

      <MemberCard
        name={me?.user.displayName ?? "Member"}
        role={role}
        verification={me?.user.email ? "Email Verified" : undefined}
        items={items}
        highlight={highlight}
      />

      <RecommendedTours />
    </div>
  );
}
