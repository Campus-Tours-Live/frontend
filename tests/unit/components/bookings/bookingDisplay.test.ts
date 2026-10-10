import {
  bookingActorLabel,
  bookingStatusEventLabel,
  bookingStatusLabel,
  bookingStatusVariant,
  canMarkTourOutcome,
  canCancelConfirmedTour,
  formatBookingTime,
  formatBookingWhen,
  formatDeadlineCountdown,
  formatStatusEventWhen,
} from "@/components/bookings/bookingDisplay";

describe("bookingDisplay", () => {
  it("includes the local calendar year and offset across year boundaries", () => {
    const iso = "2027-01-01T00:30:00Z";
    expect(formatBookingWhen(iso, "America/Los_Angeles")).toMatch(/Dec 31, 2026.*4:30 PM GMT-8/);
    expect(formatBookingWhen(iso, "Asia/Tokyo")).toMatch(/Jan 1, 2027.*9:30 AM GMT\+9/);
    expect(formatBookingTime(iso, "Asia/Kolkata")).toBe("6:00 AM GMT+5:30");
    expect(formatBookingTime(iso, "UTC")).toBe("12:30 AM GMT");
  });

  it("distinguishes repeated hours when daylight saving ends", () => {
    expect(formatBookingTime("2026-11-01T08:30:00Z", "America/Los_Angeles")).toBe("1:30 AM GMT-7");
    expect(formatBookingTime("2026-11-01T09:30:00Z", "America/Los_Angeles")).toBe("1:30 AM GMT-8");
  });

  it("skips the missing hour when daylight saving begins", () => {
    expect(formatBookingTime("2026-03-08T09:30:00Z", "America/Los_Angeles")).toBe("1:30 AM GMT-8");
    expect(formatBookingTime("2026-03-08T10:30:00Z", "America/Los_Angeles")).toBe("3:30 AM GMT-7");
  });

  it("uses the same full date and timezone for status history", () => {
    const iso = "2027-01-01T00:30:00Z";
    expect(formatStatusEventWhen(iso, "America/Los_Angeles")).toBe(
      formatBookingWhen(iso, "America/Los_Angeles"),
    );
    expect(formatStatusEventWhen("not-a-date")).toBe("not-a-date");
  });

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
    expect(bookingStatusEventLabel("GUIDE_CANCELLED")).toBe("Guide cancelled");
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

  it("allows cancel only for confirmed tours that have not started", () => {
    const now = Date.parse("2026-09-04T12:00:00Z");
    expect(canCancelConfirmedTour("CONFIRMED", "2026-09-04T13:00:00Z", now)).toBe(true);
    expect(canCancelConfirmedTour("CONFIRMED", "2026-09-04T11:00:00Z", now)).toBe(false);
    expect(canCancelConfirmedTour("WAITING_FOR_GUIDE", "2026-09-04T13:00:00Z", now)).toBe(false);
  });
});
