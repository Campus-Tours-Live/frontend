import {
  BOOKING_TIME_PLACEHOLDER,
  formatViewerLocalBookingTimeRange,
  getViewerTimeZone,
  type BookingTimeRangeInput,
} from "@/lib/bookingTime";

const summerSlot = {
  scheduledStartAt: "2026-07-10T15:00:00Z",
  scheduledEndAt: "2026-07-10T16:00:00Z",
};

function format(input: BookingTimeRangeInput, timeZone: string) {
  return formatViewerLocalBookingTimeRange(input, timeZone);
}

describe("formatViewerLocalBookingTimeRange", () => {
  it.each([
    ["America/Chicago", summerSlot, "Fri, 7/10 · 10:00 AM – 11:00 AM CDT"],
    ["Asia/Shanghai", summerSlot, "Fri, 7/10 · 11:00 PM – Sat, 7/11 · 12:00 AM GMT+8"],
    [
      "America/Chicago",
      {
        scheduledStartAt: "2026-11-01T06:30:00Z",
        scheduledEndAt: "2026-11-01T07:30:00Z",
      },
      "Sun, 11/1 · 1:30 AM CDT – 1:30 AM CST",
    ],
  ] as const)("formats UTC instants in %s", (timeZone, input, expected) => {
    expect(format(input, timeZone)).toBe(expected);
  });

  it("returns a stable placeholder for invalid input or timezone", () => {
    expect(
      format(
        { scheduledStartAt: "not-a-date", scheduledEndAt: summerSlot.scheduledEndAt },
        "America/Chicago",
      ),
    ).toBe(BOOKING_TIME_PLACEHOLDER);
    expect(format(summerSlot, "not-a-timezone")).toBe(BOOKING_TIME_PLACEHOLDER);
  });
});

describe("getViewerTimeZone", () => {
  it("reads the browser Intl timezone when available", () => {
    expect(typeof getViewerTimeZone()).toBe("string");
  });
});
