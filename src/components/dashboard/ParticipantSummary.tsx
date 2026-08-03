import {
  CalendarClock,
  CalendarDays,
  Compass,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Ticket,
  UserRound,
} from "lucide-react";
import { ViewerLocalBookingTimeRange } from "@/components/booking/ViewerLocalBookingTimeRange";
import {
  Badge,
  Body,
  Card,
  Heading,
  List,
  ListItem,
  MemberCard,
  SectionHeading,
  type MemberCardHighlight,
  type MemberCardItem,
  type MemberRole,
} from "@/components/ui";
import { useMe, type BookingResponse, type ParticipantDashboard } from "@/lib/data-access";
import { formatMonthYear, formatOfferingPrice } from "@/lib/format";

function statusLabel(status: string): string {
  return status
    .split("_")
    .filter(Boolean)
    .map((word) => word[0] + word.slice(1).toLowerCase())
    .join(" ");
}

function statusVariant(status: string): "success" | "warn" | "neutral" {
  if (status === "CONFIRMED" || status === "IN_PROGRESS") return "success";
  if (status === "CANCELLED" || status === "DRAFT" || status === "IN_CART") return "neutral";
  return "warn";
}

function BookingMeta({ booking }: { booking: BookingResponse }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      <Body as="span" size="small" color="muted" className="inline-flex items-center gap-1.5">
        <CalendarClock size={14} strokeWidth={2} aria-hidden />
        <span className="sr-only">Time: </span>
        <ViewerLocalBookingTimeRange
          scheduledStartAt={booking.scheduledStartAt}
          scheduledEndAt={booking.scheduledEndAt}
        />
      </Body>
      <Body as="span" size="small" color="muted" className="inline-flex items-center gap-1.5">
        <MapPin size={14} strokeWidth={2} aria-hidden />
        <span className="sr-only">University: </span>
        {booking.universityName}
      </Body>
      <Body as="span" size="small" color="muted" className="inline-flex items-center gap-1.5">
        <UserRound size={14} strokeWidth={2} aria-hidden />
        <span className="sr-only">Guide: </span>
        {booking.guideName}
      </Body>
    </div>
  );
}

function BookingRow({ booking }: { booking: BookingResponse }) {
  return (
    <ListItem
      leading={<Ticket size={18} strokeWidth={2} className="text-teal" aria-hidden />}
      title={
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate">{booking.tourTitle}</span>
          <Badge variant={statusVariant(booking.status)}>{statusLabel(booking.status)}</Badge>
        </span>
      }
      trailing={
        <Body as="span" size="small" weight={700} color="ink">
          {formatOfferingPrice(booking.price.amount, booking.price.currency)}
        </Body>
      }
    >
      <BookingMeta booking={booking} />
    </ListItem>
  );
}

function ParticipantBookingsPanel({ data }: { data: ParticipantDashboard }) {
  const upcoming = data.upcomingBookings.filter((booking) => booking.id !== data.nextTour?.id);
  const bookingCount = (data.nextTour ? 1 : 0) + upcoming.length;

  return (
    <Card as="section" padded={false} className="mt-6 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <Heading as="h2" size="large">
            Bookings
          </Heading>
          <Body size="small" color="muted" className="mt-1">
            Upcoming live campus tours.
          </Body>
        </div>
        {bookingCount > 0 ? (
          <Badge variant="neutral">
            {bookingCount === 1 ? "1 upcoming" : `${bookingCount} upcoming`}
          </Badge>
        ) : null}
      </div>

      {data.nextTour ? (
        <div className="border-t border-border bg-sage/10 px-5 py-4 sm:px-6">
          <Body size="small" weight={700} color="muted">
            Next tour
          </Body>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Heading as="h3" size="large">
                {data.nextTour.tourTitle}
              </Heading>
              <BookingMeta booking={data.nextTour} />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge variant={statusVariant(data.nextTour.status)}>
                {statusLabel(data.nextTour.status)}
              </Badge>
              <Body as="span" size="small" weight={700} color="ink">
                {formatOfferingPrice(data.nextTour.price.amount, data.nextTour.price.currency)}
              </Body>
            </div>
          </div>
        </div>
      ) : bookingCount === 0 ? (
        <div className="border-t border-border px-5 py-4 sm:px-6">
          <Body color="muted">No upcoming tours yet.</Body>
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <List className="border-t border-border">
          {upcoming.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </List>
      ) : null}
    </Card>
  );
}

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

      <ParticipantBookingsPanel data={data} />
    </div>
  );
}
