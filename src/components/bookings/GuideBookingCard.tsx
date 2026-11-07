"use client";

import { Body, Button, Caption, Card, Heading, Link, StatusBadge } from "@/components/ui";
import type { GuideBooking, GuideBookingFilter } from "@/lib/data-access";
import { formatOfferingPrice } from "@/lib/format";
import {
  bookingStatusLabel,
  bookingStatusVariant,
  formatBookingTime,
  formatBookingWhen,
  formatDeadlineCountdown,
} from "./bookingDisplay";

export interface GuideBookingCardProps {
  booking: GuideBooking;
  busy: boolean;
  /** When true, show time only (date comes from a schedule section header). */
  scheduleMode?: boolean;
  /** Restores the inbox filter on the detail page back link. */
  returnFilter?: GuideBookingFilter;
  onAccept: () => void | Promise<void>;
  onDecline: () => void;
}

function detailHref(bookingId: string, returnFilter: GuideBookingFilter): string {
  const base = `/guide/bookings/${bookingId}`;
  return returnFilter === "all" ? base : `${base}?returnFilter=${returnFilter}`;
}

export function GuideBookingCard({
  booking,
  busy,
  scheduleMode = false,
  returnFilter = "all",
  onAccept,
  onDecline,
}: GuideBookingCardProps) {
  const pending = booking.status === "WAITING_FOR_GUIDE";
  const countdown = pending ? formatDeadlineCountdown(booking.guideResponseDeadline) : null;
  const price = formatOfferingPrice(booking.priceCents, booking.currency);
  const href = detailHref(booking.id, returnFilter);

  return (
    <Card
      as="article"
      className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={bookingStatusVariant(booking.status)}>
            {bookingStatusLabel(booking.status)}
          </StatusBadge>
          <Caption as="span">{price}</Caption>
          {booking.bookingNumber ? (
            <Caption as="span" color="muted">
              {booking.bookingNumber}
            </Caption>
          ) : null}
        </div>
        <Heading as="h2" size="small">
          <Link href={href} className="hover:underline">
            {booking.offeringTitle}
          </Link>
        </Heading>
        <Body size="small" color="muted">
          {booking.participantName}
          {booking.universityName ? ` · ${booking.universityName}` : ""}
        </Body>
        <Body size="small">
          {(scheduleMode ? formatBookingTime : formatBookingWhen)(booking.scheduledAt)} ·{" "}
          {booking.durationMin} min
        </Body>
        {booking.participantNotes ? (
          <Caption as="p" color="muted">
            Note: {booking.participantNotes}
          </Caption>
        ) : null}
        {countdown ? (
          <Caption as="p" color={countdown.includes("expired") ? "error" : "muted"}>
            {countdown}
          </Caption>
        ) : null}
        <Link href={href} variant="secondary" className="inline-block text-ui-sm font-semibold">
          View details
        </Link>
      </div>

      {pending ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="primary" size="small" disabled={busy} onClick={() => void onAccept()}>
            Accept
          </Button>
          <Button variant="secondary" size="small" disabled={busy} onClick={onDecline}>
            Decline
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
