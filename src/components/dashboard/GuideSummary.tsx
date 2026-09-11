import { BadgeCheck, CalendarDays, Clock, GraduationCap, Inbox, List, Trophy } from "lucide-react";
import { MemberCard, type MemberCardHighlight, type MemberCardItem, Link } from "@/components/ui";
import { useMe, type GuideDashboard } from "@/lib/data-access";
import { formatMonthYear } from "@/lib/format";
import { guideStatusLabel } from "@/components/profile/guideProfileStatus";

/**
 * Guide dashboard slice — presentational. The /v1/dashboard aggregate composed the
 * profile, application status, `canPublish`, offerings, and pending booking request
 * count (DashboardPage fetches once); this renders its slice. Sibling of
 * ParticipantSummary.
 */
export function GuideSummary({ data }: { data: GuideDashboard }) {
  const { guide, guideStatus, canPublish, offerings, pendingBookingRequests, createdAt } = data;
  const { me } = useMe();
  const pendingCount = pendingBookingRequests ?? 0;

  const items: MemberCardItem[] = [
    { icon: GraduationCap, label: "Major", value: guide.universities?.[0]?.major ?? "—" },
    { icon: BadgeCheck, label: "Application", value: guideStatusLabel(guideStatus) },
    { icon: List, label: "Offerings", value: String(offerings.length) },
    {
      icon: Inbox,
      label: "Pending requests",
      value:
        pendingCount > 0 ? (
          <Link href="/guide/bookings?filter=pending" className="font-semibold">
            {pendingCount}
          </Link>
        ) : (
          "0"
        ),
    },
    { icon: CalendarDays, label: "Member since", value: formatMonthYear(createdAt) },
  ];

  const highlight: MemberCardHighlight =
    pendingCount > 0
      ? {
          icon: Inbox,
          title: (
            <Link href="/guide/bookings?filter=pending">
              {pendingCount === 1
                ? "1 booking request waiting"
                : `${pendingCount} booking requests waiting`}
            </Link>
          ),
          description: "Review and accept or decline before the response window closes.",
        }
      : canPublish
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
