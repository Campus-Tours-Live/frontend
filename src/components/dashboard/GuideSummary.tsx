import { BadgeCheck, CalendarDays, Clock, GraduationCap, Inbox, List, Trophy } from "lucide-react";
import {
  Alert,
  MemberCard,
  type MemberCardHighlight,
  type MemberCardItem,
  Link,
} from "@/components/ui";
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
  const pendingCount = pendingBookingRequests;
  const pendingAvailable =
    data.dataAvailability?.pendingBookingRequests !== false &&
    Number.isSafeInteger(pendingCount) &&
    pendingCount >= 0;
  const offeringsAvailable = data.dataAvailability?.offerings !== false;
  const verified = guideStatus === "VERIFIED" && canPublish;

  const items: MemberCardItem[] = [
    { icon: GraduationCap, label: "Major", value: guide.universities?.[0]?.major ?? "—" },
    { icon: BadgeCheck, label: "Application", value: guideStatusLabel(guideStatus) },
    {
      icon: List,
      label: "Offerings",
      value: offeringsAvailable ? (
        String(offerings.length)
      ) : (
        <Link href="/guide/tour-offerings">Unavailable</Link>
      ),
    },
    {
      icon: Inbox,
      label: "Pending requests",
      value: !pendingAvailable ? (
        <Link href="/guide/bookings?filter=pending">Unavailable</Link>
      ) : pendingCount > 0 ? (
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
    verified && pendingAvailable && pendingCount > 0
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
      : verified
        ? {
            icon: Trophy,
            title: "Verified to host",
            description:
              "Your guide account is verified. Manage offerings for your verified universities.",
          }
        : {
            icon: Clock,
            title: (
              <Link href="/guide/verification">
                {guideStatus === "PENDING"
                  ? "Verification pending"
                  : guideStatus === "REJECTED"
                    ? "Verification not approved"
                    : "Verification status unavailable"}
              </Link>
            ),
            description:
              guideStatus === "PENDING"
                ? "Your guide verification is pending. Review your verification status and profile details."
                : guideStatus === "REJECTED"
                  ? "Your guide verification was not approved. Review your verification page and profile details."
                  : "We could not confirm your hosting eligibility. Check your verification page for the current status.",
          };

  return (
    <div className="space-y-4">
      {!pendingAvailable || !offeringsAvailable ? (
        <Alert variant="warning">
          Some dashboard information could not be loaded. Open the unavailable item to try again.
        </Alert>
      ) : null}
      <MemberCard
        name={me?.user.displayName ?? "Member"}
        role="GUIDE"
        roleLabel="Student Guide"
        verification={verified ? "Guide verified" : undefined}
        items={items}
        highlight={highlight}
      />
    </div>
  );
}
