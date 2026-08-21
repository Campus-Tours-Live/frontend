import { Card, Link, SectionHeading, StatusBadge, type StatusVariant } from "@/components/ui";
import { type BookingResponse } from "@/lib/data-access";
import { formatBookingDate } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  WAITING_FOR_GUIDE: "Waiting for guide",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_VARIANT: Record<string, StatusVariant> = {
  WAITING_FOR_GUIDE: "warning",
  CONFIRMED: "success",
  COMPLETED: "info",
  CANCELLED: "error",
};

export function BookedTours({ bookings }: { bookings: BookingResponse[] }) {
  if (bookings.length === 0) return null;

  return (
    <section aria-labelledby="booked-tours-heading">
      <SectionHeading
        eyebrow="Upcoming"
        title="Your booked tours"
        titleId="booked-tours-heading"
        level={2}
        className="mb-6"
        action={
          <Link href="/my-bookings" className="shrink-0 font-semibold text-primary">
            View all
          </Link>
        }
      />
      <ul className="flex flex-col gap-4" role="list">
        {bookings.map((booking) => (
          <li key={booking.id}>
            <Card as="article" padded>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <StatusBadge variant={STATUS_VARIANT[booking.status] ?? "info"}>
                    {STATUS_LABEL[booking.status] ?? booking.status}
                  </StatusBadge>
                  <p className="font-semibold">{booking.tourTitle}</p>
                  <p className="text-sm text-muted">
                    {booking.universityName} · {formatBookingDate(booking.scheduledStartAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {booking.status === "WAITING_FOR_GUIDE" ? (
                    <Link href={`/my-bookings/${booking.id}`} variant="secondary" size="small">
                      View request
                    </Link>
                  ) : booking.status === "CONFIRMED" ? (
                    <>
                      <Link href={`/my-bookings/${booking.id}`} variant="secondary" size="small">
                        View
                      </Link>
                      <Link
                        href={`/my-bookings/${booking.id}/reschedule`}
                        variant="ghost"
                        size="small"
                      >
                        Reschedule
                      </Link>
                    </>
                  ) : (
                    <Link href={`/my-bookings/${booking.id}`} variant="secondary" size="small">
                      View
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
