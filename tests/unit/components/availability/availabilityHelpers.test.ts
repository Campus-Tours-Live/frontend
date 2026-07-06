import {
  DAY_LABELS,
  formatLocalTime,
  formatNotice,
  formatTimeRange,
  groupRulesByDay,
} from "@/components/availability/availabilityHelpers";
import type { AvailabilityRule } from "@/lib/data-access";

describe("availabilityHelpers", () => {
  it("formats local times for display", () => {
    expect(formatLocalTime("10:00")).toBe("10:00am");
    expect(formatLocalTime("13:30")).toBe("1:30pm");
    expect(formatLocalTime("01:00")).toBe("1:00am");
  });

  it("formats time ranges", () => {
    expect(formatTimeRange("10:00", "13:00")).toBe("10:00am – 1:00pm");
  });

  it("groups rules by weekday and sorts by start time", () => {
    const rules: AvailabilityRule[] = [
      {
        id: "r2",
        dayOfWeek: 1,
        startLocal: "14:00",
        endLocal: "16:00",
        timezone: "America/Los_Angeles",
        effectiveFrom: "2026-06-01",
        effectiveTo: null,
        active: true,
        createdAt: null,
      },
      {
        id: "r1",
        dayOfWeek: 1,
        startLocal: "10:00",
        endLocal: "12:00",
        timezone: "America/Los_Angeles",
        effectiveFrom: "2026-06-01",
        effectiveTo: null,
        active: true,
        createdAt: null,
      },
    ];

    const grouped = groupRulesByDay(rules);
    expect(grouped.get(1)?.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(DAY_LABELS[1]).toBe("Monday");
  });

  it("formats notice durations", () => {
    expect(formatNotice(1440)).toBe("1d");
    expect(formatNotice(120)).toBe("2h");
    expect(formatNotice(45)).toBe("45m");
  });
});
