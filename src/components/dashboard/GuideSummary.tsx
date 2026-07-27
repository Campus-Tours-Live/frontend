import { BadgeCheck, CalendarDays, Clock, GraduationCap, List, Trophy } from "lucide-react";
import { MemberCard, type MemberCardHighlight, type MemberCardItem } from "@/components/ui";
import { useMe, type GuideDashboard } from "@/lib/data-access";
import { formatMonthYear } from "@/lib/format";

/**
 * Guide dashboard slice — presentational. The /v1/dashboard aggregate composed the
 * profile, application status, `canPublish`, and offerings (DashboardPage fetches
 * once); this renders its slice. Publishing/booking actions are gated server-side on
 * application_status === APPROVED — the highlight box reflects that state. Sibling of
 * ParticipantSummary.
 */
export function GuideSummary({ data }: { data: GuideDashboard }) {
  const { guide, guideStatus, canPublish, offerings, createdAt } = data;
  const { me } = useMe();

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
    <MemberCard
      name={me?.user.displayName ?? "Member"}
      role="GUIDE"
      roleLabel="Student Guide"
      verification={canPublish ? "Identity and University Verified" : undefined}
      items={items}
      highlight={highlight}
    />
  );
}
