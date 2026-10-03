"use client";

import {
  Alert,
  Body,
  Button,
  Caption,
  Card,
  Heading,
  InlineLoading,
  Link,
  StatusBadge,
} from "@/components/ui";
import { QueryErrorAlert } from "@/components/auth/QueryErrorAlert";
import { formatBookingWhen } from "@/components/bookings/bookingDisplay";
import { useGuideNextTour } from "@/lib/data-access";

/** Compact, read-only booking preview built from the same primitives as the booking cards. */
export function GuideNextTour() {
  const { data: booking, isPending, isError, error, isFetching, refetch } = useGuideNextTour();

  return (
    <section aria-labelledby="guide-next-tour-heading" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading id="guide-next-tour-heading" as="h2" size="large">
          Next upcoming tour
        </Heading>
        <Link
          href="/guide/bookings?filter=upcoming"
          className="inline-flex min-h-11 items-center text-ui-sm font-semibold"
        >
          View all upcoming tours
        </Link>
      </div>
      {isPending ? (
        <InlineLoading label="Loading your next tour…" />
      ) : isError ? (
        <QueryErrorAlert error={error}>
          <span className="flex flex-wrap items-center gap-3">
            Could not load your next tour.
            <Button variant="secondary" disabled={isFetching} onClick={() => void refetch()}>
              {isFetching ? "Retrying…" : "Try again"}
            </Button>
          </span>
        </QueryErrorAlert>
      ) : booking ? (
        <Card as="article" className="space-y-3">
          <StatusBadge variant="success">Confirmed</StatusBadge>
          <Heading as="h3" size="medium" className="break-words">
            {booking.offeringTitle}
          </Heading>
          <Body size="small" color="muted">
            {booking.participantName}
            {booking.universityName ? ` · ${booking.universityName}` : ""}
          </Body>
          <Body size="small">
            <time dateTime={booking.scheduledAt}>{formatBookingWhen(booking.scheduledAt)}</time> ·{" "}
            {booking.durationMin} min
          </Body>
          <Caption as="p" color="muted" className="break-words">
            Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </Caption>
          <Link
            href={`/guide/bookings/${encodeURIComponent(booking.id)}?returnFilter=upcoming`}
            variant="secondary"
            className="inline-flex min-h-11 items-center font-semibold"
          >
            View booking
          </Link>
        </Card>
      ) : (
        <Alert variant="info">No upcoming confirmed tours.</Alert>
      )}
    </section>
  );
}
