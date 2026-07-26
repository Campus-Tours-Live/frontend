import { Alert, Body } from "@/components/ui";
import type { AffectedBooking } from "@/lib/data-access";

/** One affected booking's scheduled window in the guide's settings timezone —
 *  "Sat 7/18 · 9:00 – 10:00 AM". Presentation only; the instants come from the backend. */
function formatBookingWindow(startAt: string, endAt: string, timeZone: string): string {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "numeric",
    day: "numeric",
  }).format(new Date(startAt));
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  return `${day} · ${time.format(new Date(startAt))} – ${time.format(new Date(endAt))}`;
}

export interface AffectedBookingsNoticeProps {
  bookings: AffectedBooking[];
  /** Guide's settings timezone — the booking instants are rendered in it. */
  timeZone: string;
}

/**
 * "Allow + notify" surface (CTL-54 backend Task 7 / v2 allow+notify): a reducing availability
 * change is never blocked and existing bookings are never retroactively cancelled — but the guide
 * MUST be shown which existing bookings the change now overlaps, so they can follow up. Renders the
 * write envelope's `affectedBookings`; renders nothing when the list is empty. Pure presentation of
 * backend data — the FE never derives this list.
 */
export function AffectedBookingsNotice({ bookings, timeZone }: AffectedBookingsNoticeProps) {
  if (bookings.length === 0) return null;
  return (
    <Alert variant="warning" role="status">
      <Body as="p" size="small" weight={500} color="inherit">
        Saved — but{" "}
        {bookings.length === 1 ? "1 existing booking" : `${bookings.length} existing bookings`}{" "}
        overlap this change. They are kept, not cancelled — please review:
      </Body>
      <ul className="mt-1 space-y-1">
        {bookings.map((booking) => (
          <li key={booking.bookingId}>
            <Body as="span" size="small" weight={600} color="inherit">
              {booking.bookingNumber}
            </Body>{" "}
            <time dateTime={booking.scheduledStartAt}>
              {formatBookingWindow(booking.scheduledStartAt, booking.scheduledEndAt, timeZone)}
            </time>
          </li>
        ))}
      </ul>
    </Alert>
  );
}
