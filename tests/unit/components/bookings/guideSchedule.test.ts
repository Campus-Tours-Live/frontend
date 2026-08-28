import {
  formatScheduleDayHeading,
  groupBookingsByScheduleDay,
  localScheduleDayKey,
} from "@/components/bookings/guideSchedule";
import { parseGuideBookingFilter } from "@/components/bookings/useGuideBookingFilter";
import type { GuideBooking } from "@/lib/data-access";

const booking = (overrides: Partial<GuideBooking> = {}): GuideBooking => ({
  id: "b1",
  status: "CONFIRMED",
  scheduledAt: "2026-08-01T15:00:00Z",
  offeringId: "o1",
  offeringTitle: "Campus walk",
  participantName: "Sam Rivera",
  participantNotes: null,
  guideResponseDeadline: null,
  universityName: "North Coast University",
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
  ...overrides,
});

describe("guideSchedule", () => {
  it("parses valid filter query values", () => {
    expect(parseGuideBookingFilter("upcoming")).toBe("upcoming");
    expect(parseGuideBookingFilter("pending")).toBe("pending");
    expect(parseGuideBookingFilter("all")).toBe("all");
    expect(parseGuideBookingFilter("nope")).toBe("all");
    expect(parseGuideBookingFilter(null)).toBe("all");
  });

  it("derives a local day key from scheduledAt", () => {
    expect(localScheduleDayKey("2026-08-01T15:00:00Z")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(localScheduleDayKey("not-a-date")).toBeNull();
  });

  it("labels today and tomorrow relative to now", () => {
    const now = new Date("2026-08-01T12:00:00");
    expect(formatScheduleDayHeading("2026-08-01", now)).toBe("Today");
    expect(formatScheduleDayHeading("2026-08-02", now)).toBe("Tomorrow");
    expect(formatScheduleDayHeading("2026-08-05", now)).toMatch(/Wednesday/);
  });

  it("includes the year when the day is in a different calendar year", () => {
    const now = new Date("2026-08-01T12:00:00");
    expect(formatScheduleDayHeading("2027-01-15", now)).toMatch(/2027/);
  });

  it("passes through invalid day keys unchanged", () => {
    expect(formatScheduleDayHeading("not-a-day")).toBe("not-a-day");
  });

  it("groups bookings by day and sorts chronologically within each day", () => {
    const groups = groupBookingsByScheduleDay([
      booking({ id: "late", scheduledAt: "2026-08-02T18:00:00Z" }),
      booking({ id: "early", scheduledAt: "2026-08-01T10:00:00Z" }),
      booking({ id: "mid", scheduledAt: "2026-08-01T14:00:00Z" }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.bookings.map((b) => b.id)).toEqual(["early", "mid"]);
    expect(groups[1]?.bookings.map((b) => b.id)).toEqual(["late"]);
  });
});
