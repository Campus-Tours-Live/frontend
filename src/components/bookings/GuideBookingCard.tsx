"use client";

import { Body, Button, Caption, Card, Heading, StatusBadge } from "@/components/ui";
import type { GuideBooking } from "@/lib/data-access";
import { formatOfferingPrice } from "@/lib/format";
import {
  bookingStatusLabel,
  bookingStatusVariant,
  formatBookingWhen,
  formatDeadlineCountdown,
} from "./bookingDisplay";

export interface GuideBookingCardProps {
  booking: GuideBooking;
  busy: boolean;
  onAccept: () => void | Promise<void>;
  onDecline: () => void;
}

export function GuideBookingCard({ booking, busy, onAccept, onDecline }: GuideBookingCardProps) {
  const pending = booking.status === "WAITING_FOR_GUIDE";
  const countdown = pending ? formatDeadlineCountdown(booking.guideResponseDeadline) : null;
  const price = formatOfferingPrice(booking.priceCents, booking.currency);

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
        </div>
        <Heading as="h2" size="small">
          {booking.offeringTitle}
        </Heading>
        <Body size="small" color="muted">
          {booking.participantName}
          {booking.universityName ? ` · ${booking.universityName}` : ""}
        </Body>
        <Body size="small">
          {formatBookingWhen(booking.scheduledAt)} · {booking.durationMin} min
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
