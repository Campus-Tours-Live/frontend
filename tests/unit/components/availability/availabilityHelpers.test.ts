import { DAY_LABELS, formatDayHeader } from "@/components/availability/availabilityHelpers";

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

describe("formatDayHeader", () => {
  it("formats a valid ISO date as a full weekday + short month/day", () => {
    expect(formatDayHeader("2026-07-20")).toBe("Monday, Jul 20");
  });

  it("returns the input unchanged when it isn't a parseable y-m-d date (defensive fallback)", () => {
    expect(formatDayHeader("")).toBe("");
    expect(formatDayHeader("not-a-date")).toBe("not-a-date");
  });
});
