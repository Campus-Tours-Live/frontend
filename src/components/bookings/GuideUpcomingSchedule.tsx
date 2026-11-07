"use client";

import { Heading } from "@/components/ui";
import type { GuideBooking } from "@/lib/data-access";
import { GuideBookingCard } from "./GuideBookingCard";
import { groupBookingsByScheduleDay } from "./guideSchedule";

export interface GuideUpcomingScheduleProps {
  bookings: GuideBooking[];
  busy: boolean;
  onAccept: (booking: GuideBooking) => void | Promise<void>;
  onDecline: (booking: GuideBooking) => void;
}

export function GuideUpcomingSchedule({
  bookings,
  busy,
  onAccept,
  onDecline,
}: GuideUpcomingScheduleProps) {
  const groups = groupBookingsByScheduleDay(bookings);

  return (
    <div className="grid gap-6">
      {groups.map((group) => (
        <section key={group.dayKey} aria-labelledby={`schedule-${group.dayKey}`}>
          <Heading as="h2" size="small" id={`schedule-${group.dayKey}`} className="mb-3">
            {group.heading}
          </Heading>
          <div className="grid gap-4">
            {group.bookings.map((booking) => (
              <GuideBookingCard
                key={booking.id}
                booking={booking}
                scheduleMode
                busy={busy}
                onAccept={() => void onAccept(booking)}
                onDecline={() => onDecline(booking)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
