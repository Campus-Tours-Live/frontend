import {
  BOOKING_TIME_PLACEHOLDER,
  formatViewerLocalBookingTimeRange,
  getViewerTimeZone,
} from "@/lib/bookingTime";

describe("formatViewerLocalBookingTimeRange", () => {
  it("formats UTC instants in the supplied viewer timezone", () => {
    expect(
      formatViewerLocalBookingTimeRange(
        {
          scheduledStartAt: "2026-07-10T15:00:00Z",
          scheduledEndAt: "2026-07-10T16:00:00Z",
        },
        "America/Chicago",
      ),
    ).toBe("Fri, 7/10 · 10:00 AM – 11:00 AM CDT");
  });

  it("includes the end date when the viewer-local range crosses midnight", () => {
    expect(
      formatViewerLocalBookingTimeRange(
        {
          scheduledStartAt: "2026-07-10T15:00:00Z",
          scheduledEndAt: "2026-07-10T16:00:00Z",
        },
        "Asia/Shanghai",
      ),
    ).toBe("Fri, 7/10 · 11:00 PM – Sat, 7/11 · 12:00 AM GMT+8");
  });

  it("includes both timezone labels when the range crosses a DST offset change", () => {
    expect(
      formatViewerLocalBookingTimeRange(
        {
          scheduledStartAt: "2026-11-01T06:30:00Z",
          scheduledEndAt: "2026-11-01T07:30:00Z",
        },
        "America/Chicago",
      ),
    ).toBe("Sun, 11/1 · 1:30 AM CDT – 1:30 AM CST");
  });

  it("returns a stable placeholder for invalid input or timezone", () => {
    expect(
      formatViewerLocalBookingTimeRange(
        { scheduledStartAt: "not-a-date", scheduledEndAt: "2026-07-10T16:00:00Z" },
        "America/Chicago",
      ),
    ).toBe(BOOKING_TIME_PLACEHOLDER);
    expect(
      formatViewerLocalBookingTimeRange(
        {
          scheduledStartAt: "2026-07-10T15:00:00Z",
          scheduledEndAt: "2026-07-10T16:00:00Z",
        },
        "not-a-timezone",
      ),
    ).toBe(BOOKING_TIME_PLACEHOLDER);
  });
});

describe("getViewerTimeZone", () => {
  it("reads the browser Intl timezone when available", () => {
    expect(typeof getViewerTimeZone()).toBe("string");
  });
});
