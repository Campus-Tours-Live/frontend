import { BadgeCheck, CalendarDays, Clock, GraduationCap, List, Trophy } from "lucide-react";
import { MemberCard, type MemberCardHighlight, type MemberCardItem } from "@/components/ui";
import { useMe, type GuideDashboard } from "@/lib/data-access";
import { formatMonthYear } from "@/lib/format";
import { guideStatusLabel } from "@/components/profile/guideProfileStatus";

/** Renders the guide portion of the dashboard. */
export function GuideSummary({ data }: { data: GuideDashboard }) {
  const { guide, guideStatus, canPublish, offerings, createdAt } = data;
  const { me } = useMe();

  const items: MemberCardItem[] = [
    { icon: GraduationCap, label: "Major", value: guide.universities?.[0]?.major ?? "—" },
    { icon: BadgeCheck, label: "Application", value: guideStatusLabel(guideStatus) },
    { icon: List, label: "Offerings", value: String(offerings.length) },
    { icon: CalendarDays, label: "Member since", value: formatMonthYear(createdAt) },
  ];

  const highlight: MemberCardHighlight = canPublish
    ? {
        icon: Trophy,
        title: "Verified to host",
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
