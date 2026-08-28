import type { GuideBooking, GuideBookingFilter } from "@/lib/data-access";

/** Stable demo ids — open /guide/bookings/demo-pending or /guide/bookings/demo-confirmed locally. */
export const DEMO_GUIDE_BOOKING_IDS = {
  pending: "demo-pending",
  confirmed: "demo-confirmed",
  confirmedLater: "demo-confirmed-2",
} as const;

export function isDemoGuideBookingId(id: string): boolean {
  return id.startsWith("demo-");
}

const pendingBooking: GuideBooking = {
  id: DEMO_GUIDE_BOOKING_IDS.pending,
  bookingNumber: "CTL-2026-DEMO01",
  status: "WAITING_FOR_GUIDE",
  scheduledAt: "2026-09-03T17:00:00.000Z",
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
  scheduledAt: "2026-09-02T15:00:00.000Z",
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
  scheduledAt: "2026-09-05T22:00:00.000Z",
  durationMin: 45,
  priceCents: 3500,
};

export const DEMO_GUIDE_BOOKINGS: GuideBooking[] = [
  pendingBooking,
  confirmedBooking,
  confirmedLaterBooking,
];

export function getDemoGuideBooking(id: string): GuideBooking | undefined {
  return DEMO_GUIDE_BOOKINGS.find((b) => b.id === id);
}

export function demoGuideBookingsForFilter(filter: GuideBookingFilter): GuideBooking[] {
  switch (filter) {
    case "pending":
      return DEMO_GUIDE_BOOKINGS.filter((b) => b.status === "WAITING_FOR_GUIDE");
    case "upcoming":
      return DEMO_GUIDE_BOOKINGS.filter((b) => b.status === "CONFIRMED");
    case "all":
    default:
      return [...DEMO_GUIDE_BOOKINGS];
  }
}
