"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Body,
  Button,
  Caption,
  Card,
  Heading,
  InlineLoading,
  Link,
  PageContainer,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { QueryErrorAlert } from "@/components/auth/QueryErrorAlert";
import {
  useAcceptBooking,
  useDeclineBooking,
  useGuideBooking,
  type GuideBookingFilter,
} from "@/lib/data-access";
import { formatOfferingPrice } from "@/lib/format";
import { DeclineBookingModal } from "./DeclineBookingModal";
import { GuideBookingStatusTimeline } from "./GuideBookingStatusTimeline";
import {
  bookingStatusLabel,
  bookingStatusVariant,
  formatBookingWhen,
  formatDeadlineCountdown,
} from "./bookingDisplay";
import { parseGuideBookingFilter } from "./useGuideBookingFilter";

function bookingsListHref(filter: GuideBookingFilter): string {
  if (filter === "all") return "/guide/bookings";
  return `/guide/bookings?filter=${filter}`;
}

export function GuideBookingDetailPage({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnFilter = parseGuideBookingFilter(searchParams.get("returnFilter"));
  const { data: booking, isLoading, isError, error } = useGuideBooking(bookingId);
  const accept = useAcceptBooking();
  const decline = useDeclineBooking();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const pending = booking?.status === "WAITING_FOR_GUIDE";
  const countdown =
    pending && booking ? formatDeadlineCountdown(booking.guideResponseDeadline) : null;

  return (
    <PageContainer width="wide">
      <Link
        href={bookingsListHref(returnFilter)}
        className="mb-4 inline-flex items-center gap-2 text-ui-sm font-semibold"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to bookings
      </Link>

      {isLoading ? <InlineLoading label="Loading booking…" /> : null}

      {isError ? (
        <QueryErrorAlert error={error}>Failed to load this booking.</QueryErrorAlert>
      ) : null}

      {!isLoading && !isError && !booking ? (
        <Alert variant="warning">
          This booking was not found.{" "}
          <Link href={bookingsListHref(returnFilter)}>Return to your bookings</Link>
        </Alert>
      ) : null}

      {booking ? (
        <>
          <PageHeader
            title={booking.offeringTitle}
            lead={`Booking ${booking.bookingNumber} · ${booking.participantName}`}
            action={
              pending ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="small"
                    disabled={accept.isPending || decline.isPending}
                    onClick={async () => {
                      setActionError(null);
                      try {
                        await accept.mutateAsync(booking.id);
                      } catch {
                        setActionError("Could not accept this booking. Please try again.");
                      }
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={accept.isPending || decline.isPending}
                    onClick={() => {
                      setActionError(null);
                      setDeclineOpen(true);
                    }}
                  >
                    Decline
                  </Button>
                </div>
              ) : null
            }
          />

          {actionError ? <Alert variant="error">{actionError}</Alert> : null}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <Card as="section" className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge variant={bookingStatusVariant(booking.status)}>
                  {bookingStatusLabel(booking.status)}
                </StatusBadge>
                <Caption as="span">
                  {formatOfferingPrice(booking.priceCents, booking.currency)}
                </Caption>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Body as="dt" size="small" color="muted">
                    Scheduled
                  </Body>
                  <Body as="dd" size="small" weight={600}>
                    <time dateTime={booking.scheduledAt}>
                      {formatBookingWhen(booking.scheduledAt)} · {booking.durationMin} min
                    </time>
                  </Body>
                </div>
                <div>
                  <Body as="dt" size="small" color="muted">
                    University
                  </Body>
                  <Body as="dd" size="small" weight={600}>
                    {booking.universityName}
                  </Body>
                </div>
                <div>
                  <Body as="dt" size="small" color="muted">
                    Participant
                  </Body>
                  <Body as="dd" size="small" weight={600}>
                    {booking.participantName}
                  </Body>
                </div>
                <div>
                  <Body as="dt" size="small" color="muted">
                    Booking reference
                  </Body>
                  <Body as="dd" size="small" weight={600}>
                    {booking.bookingNumber}
                  </Body>
                </div>
              </dl>

              {booking.participantNotes ? (
                <div>
                  <Body as="p" size="small" weight={600}>
                    Participant notes
                  </Body>
                  <Body as="p" size="small" color="muted" className="mt-1 whitespace-pre-wrap">
                    {booking.participantNotes}
                  </Body>
                </div>
              ) : (
                <Body size="small" color="muted">
                  No participant notes for this booking.
                </Body>
              )}

              {countdown ? (
                <Alert variant={countdown.includes("expired") ? "error" : "info"}>
                  {countdown}
                </Alert>
              ) : null}
            </Card>

            <Card as="section">
              <Heading as="h2" size="small" className="mb-4">
                Status history
              </Heading>
              <GuideBookingStatusTimeline events={booking.statusHistory ?? []} />
            </Card>
          </div>

          <DeclineBookingModal
            key={booking.id}
            open={declineOpen}
            booking={booking}
            pending={decline.isPending}
            onClose={() => setDeclineOpen(false)}
            onConfirm={async (reason) => {
              try {
                await decline.mutateAsync({
                  bookingId: booking.id,
                  body: reason ? { reason } : undefined,
                });
                setDeclineOpen(false);
                router.push(bookingsListHref("pending"));
              } catch {
                setActionError("Could not decline this booking. Please try again.");
                setDeclineOpen(false);
              }
            }}
          />
        </>
      ) : null}
    </PageContainer>
  );
}
