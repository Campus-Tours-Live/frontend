import { bookingStatusLabel, formatDeadlineCountdown } from "@/components/bookings/bookingDisplay";

describe("bookingDisplay", () => {
  it("labels waiting status as Pending", () => {
    expect(bookingStatusLabel("WAITING_FOR_GUIDE")).toBe("Pending");
  });

  it("formats a future deadline countdown", () => {
    const now = Date.parse("2026-08-01T10:00:00Z");
    const deadline = "2026-08-01T11:30:00Z";
    expect(formatDeadlineCountdown(deadline, now)).toBe("1h 30m left to respond");
  });

  it("reports expired deadlines", () => {
    const now = Date.parse("2026-08-01T12:00:00Z");
    expect(formatDeadlineCountdown("2026-08-01T11:00:00Z", now)).toBe("Response window expired");
  });
});
