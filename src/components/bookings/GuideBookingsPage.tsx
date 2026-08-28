"use client";

import { useState } from "react";
import { Alert, Chip, InlineLoading, Link, PageContainer, PageHeader } from "@/components/ui";
import { QueryErrorAlert } from "@/components/auth/QueryErrorAlert";
import {
  useAcceptBooking,
  useDeclineBooking,
  useGuideBookings,
  type GuideBooking,
  type GuideBookingFilter,
} from "@/lib/data-access";
import { GuideBookingCard } from "./GuideBookingCard";
import { DeclineBookingModal } from "./DeclineBookingModal";
import { GuideUpcomingSchedule } from "./GuideUpcomingSchedule";
import { useGuideBookingFilter } from "./useGuideBookingFilter";
import { demoGuideBookingsEnabled } from "./guideBookingDemo";
import { DEMO_GUIDE_BOOKING_IDS } from "./guideBookingFixtures";

const FILTERS: { id: GuideBookingFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "upcoming", label: "Upcoming" },
];

const PAGE_COPY: Record<GuideBookingFilter, { title: string; lead: string }> = {
  all: {
    title: "Bookings",
    lead: "Accept or decline new requests and review your upcoming confirmed tours.",
  },
  pending: {
    title: "Booking requests",
    lead: "Review and respond to new tour requests before their response window closes.",
  },
  upcoming: {
    title: "Upcoming tours",
    lead: "Your confirmed schedule — tours starting from today.",
  },
};

export function GuideBookingsPage() {
  const { filter, setFilter } = useGuideBookingFilter();
  const { data: bookings = [], isLoading, isError, error } = useGuideBookings(filter);
  const accept = useAcceptBooking();
  const decline = useDeclineBooking();
  const [declineTarget, setDeclineTarget] = useState<GuideBooking | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const copy = PAGE_COPY[filter];
  const cardHandlers = {
    busy: accept.isPending || decline.isPending,
    onAccept: async (booking: GuideBooking) => {
      setActionError(null);
      try {
        await accept.mutateAsync(booking.id);
      } catch {
        setActionError("Could not accept this booking. Please try again.");
      }
    },
    onDecline: (booking: GuideBooking) => {
      setActionError(null);
      setDeclineTarget(booking);
    },
  };

  return (
    <PageContainer width="wide">
      <PageHeader title={copy.title} lead={copy.lead} />

      {demoGuideBookingsEnabled() ? (
        <Alert variant="info">
          Local demo bookings are included in dev. Try{" "}
          <Link href={`/guide/bookings/${DEMO_GUIDE_BOOKING_IDS.pending}?returnFilter=pending`}>
            pending detail
          </Link>{" "}
          or{" "}
          <Link href={`/guide/bookings/${DEMO_GUIDE_BOOKING_IDS.confirmed}?returnFilter=upcoming`}>
            confirmed detail
          </Link>
          .
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter bookings">
        {FILTERS.map((tab) => (
          <Chip key={tab.id} active={filter === tab.id} onClick={() => setFilter(tab.id)}>
            {tab.label}
          </Chip>
        ))}
      </div>

      {actionError ? <Alert variant="error">{actionError}</Alert> : null}

      {isLoading ? <InlineLoading label="Loading bookings…" /> : null}

      {isError ? (
        <QueryErrorAlert error={error}>Failed to load your bookings.</QueryErrorAlert>
      ) : null}

      {!isLoading && !isError && bookings.length === 0 ? (
        <Alert variant="info">
          {filter === "pending"
            ? "No pending booking requests."
            : filter === "upcoming"
              ? "No upcoming confirmed tours."
              : "You have no pending or upcoming bookings."}
        </Alert>
      ) : null}

      {!isLoading && !isError && bookings.length > 0 ? (
        filter === "upcoming" ? (
          <GuideUpcomingSchedule
            bookings={bookings}
            returnFilter="upcoming"
            busy={cardHandlers.busy}
            onAccept={(booking) => void cardHandlers.onAccept(booking)}
            onDecline={cardHandlers.onDecline}
          />
        ) : (
          <div className="grid gap-4">
            {bookings.map((booking) => (
              <GuideBookingCard
                key={booking.id}
                booking={booking}
                returnFilter={filter}
                busy={cardHandlers.busy}
                onAccept={() => void cardHandlers.onAccept(booking)}
                onDecline={() => cardHandlers.onDecline(booking)}
              />
            ))}
          </div>
        )
      ) : null}

      <DeclineBookingModal
        key={declineTarget?.id ?? "closed"}
        open={declineTarget != null}
        booking={declineTarget}
        pending={decline.isPending}
        onClose={() => setDeclineTarget(null)}
        onConfirm={async (reason) => {
          if (!declineTarget) return;
          try {
            await decline.mutateAsync({
              bookingId: declineTarget.id,
              body: reason ? { reason } : undefined,
            });
            setDeclineTarget(null);
          } catch {
            setActionError("Could not decline this booking. Please try again.");
            setDeclineTarget(null);
          }
        }}
      />
    </PageContainer>
  );
}
