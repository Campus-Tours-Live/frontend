import {
  bookingActorLabel,
  bookingStatusEventLabel,
  bookingStatusLabel,
  bookingStatusVariant,
  canMarkTourOutcome,
  formatBookingTime,
  formatBookingWhen,
  formatDeadlineCountdown,
  formatStatusEventWhen,
} from "@/components/bookings/bookingDisplay";

describe("bookingDisplay", () => {
  it("labels waiting status as Pending", () => {
    expect(bookingStatusLabel("WAITING_FOR_GUIDE")).toBe("Pending");
  });

  it("labels confirmed, completed, no-show, and cancelled statuses", () => {
    expect(bookingStatusLabel("CONFIRMED")).toBe("Confirmed");
    expect(bookingStatusLabel("COMPLETED")).toBe("Completed");
    expect(bookingStatusLabel("PARTICIPANT_NO_SHOW")).toBe("Participant no-show");
    expect(bookingStatusLabel("GUIDE_NO_SHOW")).toBe("Guide no-show");
    expect(bookingStatusLabel("CANCELLED")).toBe("Declined / cancelled");
    expect(bookingStatusLabel("OTHER")).toBe("OTHER");
  });

  it("maps status variants", () => {
    expect(bookingStatusVariant("WAITING_FOR_GUIDE")).toBe("warning");
    expect(bookingStatusVariant("CONFIRMED")).toBe("success");
    expect(bookingStatusVariant("COMPLETED")).toBe("success");
    expect(bookingStatusVariant("PARTICIPANT_NO_SHOW")).toBe("warning");
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
    expect(bookingStatusEventLabel("GUIDE_MARKED_COMPLETED")).toBe("Marked completed");
    expect(bookingStatusEventLabel("GUIDE_MARKED_PARTICIPANT_NO_SHOW")).toBe(
      "Marked participant no-show",
    );
    expect(bookingStatusEventLabel("UNKNOWN_CODE")).toBe("unknown code");
    expect(bookingActorLabel("GUIDE")).toBe("Guide");
    expect(formatStatusEventWhen("2026-08-01T15:00:00Z")).toMatch(/Aug/);
  });

  it("allows mark-complete only for started confirmed tours", () => {
    const now = Date.parse("2026-09-04T12:00:00Z");
    expect(canMarkTourOutcome("CONFIRMED", "2026-09-04T11:00:00Z", now)).toBe(true);
    expect(canMarkTourOutcome("CONFIRMED", "2026-09-04T13:00:00Z", now)).toBe(false);
    expect(canMarkTourOutcome("COMPLETED", "2026-09-04T11:00:00Z", now)).toBe(false);
    expect(canMarkTourOutcome("WAITING_FOR_GUIDE", "2026-09-04T11:00:00Z", now)).toBe(false);
  });
});
