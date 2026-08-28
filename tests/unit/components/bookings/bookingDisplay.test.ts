import {
  bookingActorLabel,
  bookingStatusEventLabel,
  bookingStatusLabel,
  bookingStatusVariant,
  formatBookingTime,
  formatBookingWhen,
  formatDeadlineCountdown,
  formatStatusEventWhen,
} from "@/components/bookings/bookingDisplay";

describe("bookingDisplay", () => {
  it("labels waiting status as Pending", () => {
    expect(bookingStatusLabel("WAITING_FOR_GUIDE")).toBe("Pending");
  });

  it("labels confirmed and cancelled statuses", () => {
    expect(bookingStatusLabel("CONFIRMED")).toBe("Confirmed");
    expect(bookingStatusLabel("CANCELLED")).toBe("Declined / cancelled");
    expect(bookingStatusLabel("OTHER")).toBe("OTHER");
  });

  it("maps status variants", () => {
    expect(bookingStatusVariant("WAITING_FOR_GUIDE")).toBe("warning");
    expect(bookingStatusVariant("CONFIRMED")).toBe("success");
    expect(bookingStatusVariant("CANCELLED")).toBe("info");
  });

  it("formats a valid scheduled time and passes through invalid ISO", () => {
    expect(formatBookingWhen("not-a-date")).toBe("not-a-date");
    expect(formatBookingWhen("2026-08-01T15:00:00Z")).toMatch(/Aug/);
    expect(formatBookingTime("2026-08-01T15:00:00Z")).toMatch(/\d/);
    expect(formatBookingTime("not-a-date")).toBe("not-a-date");
  });

  it("formats a future deadline countdown", () => {
    const now = Date.parse("2026-08-01T10:00:00Z");
    const deadline = "2026-08-01T11:30:00Z";
    expect(formatDeadlineCountdown(deadline, now)).toBe("1h 30m left to respond");
  });

  it("formats whole-hour and sub-hour countdowns", () => {
    const now = Date.parse("2026-08-01T10:00:00Z");
    expect(formatDeadlineCountdown("2026-08-01T12:00:00Z", now)).toBe("2h left to respond");
    expect(formatDeadlineCountdown("2026-08-01T10:45:00Z", now)).toBe("45m left to respond");
  });

  it("reports expired deadlines and ignores missing/invalid ones", () => {
    const now = Date.parse("2026-08-01T12:00:00Z");
    expect(formatDeadlineCountdown("2026-08-01T11:00:00Z", now)).toBe("Response window expired");
    expect(formatDeadlineCountdown(null, now)).toBeNull();
    expect(formatDeadlineCountdown("not-a-date", now)).toBeNull();
  });

  it("labels status events and actors for the timeline", () => {
    expect(bookingStatusEventLabel("GUIDE_ACCEPTED")).toBe("Guide accepted");
    expect(bookingStatusEventLabel("UNKNOWN_CODE")).toBe("unknown code");
    expect(bookingActorLabel("GUIDE")).toBe("Guide");
    expect(formatStatusEventWhen("2026-08-01T15:00:00Z")).toMatch(/Aug/);
  });
});
