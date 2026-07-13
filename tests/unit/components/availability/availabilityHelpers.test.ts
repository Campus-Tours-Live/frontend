import { DAY_LABELS } from "@/components/availability/availabilityHelpers";

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
