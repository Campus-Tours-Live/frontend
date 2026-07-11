import { DAY_LABELS, formatExceptionDate } from "@/components/availability/availabilityHelpers";

describe("DAY_LABELS", () => {
  it("has all seven weekdays, Sunday first (0-indexed, matches BFF dayOfWeek)", () => {
    expect(DAY_LABELS).toEqual([
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]);
  });
});

describe("formatExceptionDate", () => {
  it("renders an ISO date as a short weekday + month + day + year", () => {
    expect(formatExceptionDate("2026-03-10")).toBe("Tue, Mar 10, 2026");
  });

  it("falls back to the raw string for an unparsable date", () => {
    expect(formatExceptionDate("not-a-date")).toBe("not-a-date");
  });
});
