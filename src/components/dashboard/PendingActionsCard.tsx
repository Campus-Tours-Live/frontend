import { Heading, Body, Link } from "@/components/ui";
import type { PendingActions, BookingResponse } from "@/lib/data-access";

interface CounterProps {
  value: number;
  label: string;
}

function Counter({ value, label }: CounterProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Heading as="span" size="large">
        {value}
      </Heading>
      <Body size="small" color="muted" className="text-center">
        {label}
      </Body>
    </div>
  );
}

interface GuideResponseProps {
  booking: BookingResponse;
}

function GuideResponsePending({ booking }: GuideResponseProps) {
  const deadline = booking.guideResponseDeadline
    ? new Date(booking.guideResponseDeadline).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : null;

  return (
    <div className="card px-5 py-4 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Body size="small" weight={500}>
            Guide response pending
          </Body>
          {deadline && (
            <Body size="small" color="muted" className="mt-0.5">
              Maya has until {deadline} to respond.
            </Body>
          )}
        </div>
        <Link href={`/my-bookings`} variant="secondary" size="small" className="shrink-0">
          View
        </Link>
      </div>
    </div>
  );
}

export interface PendingActionsCardProps {
  actions: PendingActions;
  /** The first WAITING_FOR_GUIDE booking, shown as a "Guide response pending" card. */
  waitingBooking?: BookingResponse | null;
}

/** Right-rail card on the participant dashboard — pending action counts + guide-response nudge. */
export function PendingActionsCard({ actions, waitingBooking }: PendingActionsCardProps) {
  const hasActions =
    actions.paymentsToFinish > 0 || actions.waitingForGuide > 0 || actions.reviewsToWrite > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="card px-5 py-5 sm:px-6">
        <Body size="small" color="muted" className="uppercase tracking-wide mb-4">
          Need your attention
        </Body>
        <Heading as="h2" size="medium" className="mb-4">
          Pending actions
        </Heading>
        <div className="flex justify-around">
          <Counter value={actions.paymentsToFinish} label="Payments to finish" />
          <Counter value={actions.waitingForGuide} label="Waiting for guide" />
          <Counter value={actions.reviewsToWrite} label="Reviews to write" />
        </div>
        {!hasActions && (
          <Body size="small" color="muted" className="mt-4 text-center">
            You&apos;re all caught up!
          </Body>
        )}
      </div>

      {waitingBooking && <GuideResponsePending booking={waitingBooking} />}
    </div>
  );
}
