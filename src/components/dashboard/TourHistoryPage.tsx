"use client";

import { SectionHeading, InlineLoading, Body, Badge, Button, Heading } from "@/components/ui";
import { useBookingHistory, type BookingResponse } from "@/lib/data-access";
import { QueryErrorAlert } from "@/components/auth/QueryErrorAlert";
import { formatShortDate } from "@/lib/format";

function BookingHistoryCard({ booking }: { booking: BookingResponse }) {
  const isCompleted = booking.status === "COMPLETED";

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2">
            <Badge variant={isCompleted ? "success" : "neutral"}>{booking.status}</Badge>
          </div>
          <Heading as="h3" size="medium" className="truncate">
            {booking.tourTitle}
          </Heading>
          <Body size="small" color="muted" className="mt-1">
            {booking.universityName} · {formatShortDate(booking.scheduledStartAt)} ·{" "}
            {booking.guideName}
          </Body>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="small" disabled>
            View Summary
          </Button>
          <Button variant="ghost" size="small" disabled>
            Leave Review
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Full Tour History page — lists the participant's completed past tours. */
export function TourHistoryPage() {
  const { data, isLoading, isError, error } = useBookingHistory();

  return (
    <div>
      <SectionHeading
        title="My Tours"
        lead="Completed tours, summaries, recordings when available, and reviews."
      />

      <div className="mt-8">
        {isLoading && <InlineLoading label="Loading your tour history…" />}

        {isError && (
          <QueryErrorAlert error={error}>Failed to load your tour history</QueryErrorAlert>
        )}

        {!isLoading && !isError && data && data.length === 0 && (
          <Body color="muted">No completed tours yet.</Body>
        )}

        {data && data.length > 0 && (
          <div className="flex flex-col gap-4">
            {data.map((booking) => (
              <BookingHistoryCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
