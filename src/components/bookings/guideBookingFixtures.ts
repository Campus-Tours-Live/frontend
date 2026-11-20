import type { GuideBooking, GuideBookingFilter } from "@/lib/data-access";

/** Stable demo ids — open /guide/bookings/demo-* locally. */
export const DEMO_GUIDE_BOOKING_IDS = {
  pending: "demo-pending",
  confirmed: "demo-confirmed",
  confirmedLater: "demo-confirmed-2",
  overdue: "demo-overdue",
  completed: "demo-completed",
  noShow: "demo-noshow",
} as const;

export function isDemoGuideBookingId(id: string): boolean {
  return id.startsWith("demo-");
}

function scheduledEndMs(booking: Pick<GuideBooking, "scheduledAt" | "durationMin">): number {
  return new Date(booking.scheduledAt).getTime() + booking.durationMin * 60_000;
}

const pendingBooking: GuideBooking = {
  id: DEMO_GUIDE_BOOKING_IDS.pending,
  bookingNumber: "CTL-2026-DEMO01",
  status: "WAITING_FOR_GUIDE",
  scheduledAt: "2099-06-03T17:00:00.000Z",
  offeringId: "demo-offering-1",
  offeringTitle: "Campus highlights walk",
  participantName: "Sam Rivera",
  participantNotes:
    "First time visiting — we'd love to see the library and the main quad. Happy to meet at the visitor gate.",
  guideResponseDeadline: "2099-12-31T23:59:59.000Z",
  universityName: "North Coast University",
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
  statusHistory: [
    {
      status: "WAITING_FOR_GUIDE",
      previousStatus: null,
      actor: "PARTICIPANT",
      reasonCode: "PARTICIPANT_CREATED",
      occurredAt: "2026-08-27T14:30:00.000Z",
    },
    {
      status: "WAITING_FOR_GUIDE",
      previousStatus: "DRAFT",
      actor: "PARTICIPANT",
      reasonCode: "CART_CHECKOUT",
      occurredAt: "2026-08-27T14:32:00.000Z",
    },
  ],
};

const confirmedBooking: GuideBooking = {
  id: DEMO_GUIDE_BOOKING_IDS.confirmed,
  bookingNumber: "CTL-2026-DEMO02",
  status: "CONFIRMED",
  scheduledAt: "2099-06-02T15:00:00.000Z",
  offeringId: "demo-offering-2",
  offeringTitle: "Engineering tour & labs",
  participantName: "Jordan Lee",
  participantNotes: "Interested in CS buildings and study spaces.",
  guideResponseDeadline: null,
  universityName: "North Coast University",
  durationMin: 90,
  priceCents: 5500,
  currency: "USD",
  statusHistory: [
    {
      status: "WAITING_FOR_GUIDE",
      previousStatus: null,
      actor: "PARTICIPANT",
      reasonCode: "PARTICIPANT_CREATED",
      occurredAt: "2026-08-20T10:00:00.000Z",
    },
    {
      status: "CONFIRMED",
      previousStatus: "WAITING_FOR_GUIDE",
      actor: "GUIDE",
      reasonCode: "GUIDE_ACCEPTED",
      occurredAt: "2026-08-20T11:15:00.000Z",
    },
  ],
};

const confirmedLaterBooking: GuideBooking = {
  ...confirmedBooking,
  id: DEMO_GUIDE_BOOKING_IDS.confirmedLater,
  bookingNumber: "CTL-2026-DEMO03",
  offeringTitle: "Evening campus stroll",
  participantName: "Alex Kim",
  participantNotes: null,
  scheduledAt: "2099-06-05T22:00:00.000Z",
  durationMin: 45,
  priceCents: 3500,
};

const overdueBooking: GuideBooking = {
  ...confirmedBooking,
  id: DEMO_GUIDE_BOOKING_IDS.overdue,
  bookingNumber: "CTL-2026-DEMO04",
  offeringTitle: "Library & study spaces",
  participantName: "Casey Morgan",
  participantNotes: "Running a few minutes late — text if needed.",
  scheduledAt: "2026-08-20T16:00:00.000Z",
  durationMin: 60,
  priceCents: 4000,
  statusHistory: [
    {
      status: "CONFIRMED",
      previousStatus: "WAITING_FOR_GUIDE",
      actor: "GUIDE",
      reasonCode: "GUIDE_ACCEPTED",
      occurredAt: "2026-08-18T09:00:00.000Z",
    },
  ],
};

const completedBooking: GuideBooking = {
  ...confirmedBooking,
  id: DEMO_GUIDE_BOOKING_IDS.completed,
  bookingNumber: "CTL-2026-DEMO05",
  status: "COMPLETED",
  offeringTitle: "Admissions office walkthrough",
  participantName: "Riley Chen",
  participantNotes: null,
  scheduledAt: "2026-08-10T14:00:00.000Z",
  durationMin: 75,
  priceCents: 4800,
  statusHistory: [
    {
      status: "CONFIRMED",
      previousStatus: "WAITING_FOR_GUIDE",
      actor: "GUIDE",
      reasonCode: "GUIDE_ACCEPTED",
      occurredAt: "2026-08-01T12:00:00.000Z",
    },
    {
      status: "COMPLETED",
      previousStatus: "CONFIRMED",
      actor: "GUIDE",
      reasonCode: "GUIDE_MARKED_COMPLETED",
      occurredAt: "2026-08-10T15:20:00.000Z",
    },
  ],
};

const noShowBooking: GuideBooking = {
  ...confirmedBooking,
  id: DEMO_GUIDE_BOOKING_IDS.noShow,
  bookingNumber: "CTL-2026-DEMO06",
  status: "PARTICIPANT_NO_SHOW",
  offeringTitle: "Dorm life peek",
  participantName: "Taylor Brooks",
  participantNotes: null,
  scheduledAt: "2026-08-05T18:00:00.000Z",
  durationMin: 45,
  priceCents: 3200,
  statusHistory: [
    {
      status: "CONFIRMED",
      previousStatus: "WAITING_FOR_GUIDE",
      actor: "GUIDE",
      reasonCode: "GUIDE_ACCEPTED",
      occurredAt: "2026-07-28T10:00:00.000Z",
    },
    {
      status: "PARTICIPANT_NO_SHOW",
      previousStatus: "CONFIRMED",
      actor: "GUIDE",
      reasonCode: "GUIDE_MARKED_PARTICIPANT_NO_SHOW",
      occurredAt: "2026-08-05T18:45:00.000Z",
    },
  ],
};

export const DEMO_GUIDE_BOOKINGS: GuideBooking[] = [
  pendingBooking,
  confirmedBooking,
  confirmedLaterBooking,
  overdueBooking,
  completedBooking,
  noShowBooking,
];

export function getDemoGuideBooking(id: string): GuideBooking | undefined {
  return DEMO_GUIDE_BOOKINGS.find((b) => b.id === id);
}

export function demoGuideBookingsForFilter(filter: GuideBookingFilter): GuideBooking[] {
  const now = Date.now();
  switch (filter) {
    case "pending":
      return DEMO_GUIDE_BOOKINGS.filter((b) => b.status === "WAITING_FOR_GUIDE");
    case "upcoming":
      return DEMO_GUIDE_BOOKINGS.filter(
        (b) => b.status === "CONFIRMED" && new Date(b.scheduledAt).getTime() >= now,
      );
    case "past":
      return DEMO_GUIDE_BOOKINGS.filter((b) => {
        if (
          b.status === "COMPLETED" ||
          b.status === "PARTICIPANT_NO_SHOW" ||
          b.status === "GUIDE_NO_SHOW"
        ) {
          return true;
        }
        return b.status === "CONFIRMED" && scheduledEndMs(b) < now;
      });
    case "all":
      return [...demoGuideBookingsForFilter("pending"), ...demoGuideBookingsForFilter("upcoming")];
    default:
      return [...DEMO_GUIDE_BOOKINGS];
  }
}
