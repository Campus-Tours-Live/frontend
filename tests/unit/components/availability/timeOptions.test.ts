import {
  START_TIME_OPTIONS,
  buildTimeOptions,
  coerceEndTimeAfterStart,
  defaultEndTime,
  defaultStartTime,
  endTimeOptionsAfter,
  isEndAfterStart,
  localTimeToMinutes,
  normalizeRuleTimeRange,
  normalizeTimeValue,
  sanitizeRuleTimes,
  snapToTimeGrid,
} from "@/lib/availability/timeOptions";

describe("timeOptions", () => {
  it("builds 15-minute slots for a full day", () => {
    expect(buildTimeOptions(15)).toHaveLength(96);
    expect(START_TIME_OPTIONS[0]).toEqual({ value: "00:00", label: "12:00am" });
    expect(START_TIME_OPTIONS.at(-1)).toEqual({ value: "23:45", label: "11:45pm" });
  });

  it("normalizes HH:mm:ss values from the API", () => {
    expect(normalizeTimeValue("16:00:00")).toBe("16:00");
  });

  it("filters end options to times after start", () => {
    const options = endTimeOptionsAfter("09:00");
    expect(options[0]).toEqual({ value: "09:15", label: "9:15am" });
    expect(options.some((option) => option.value === "09:00")).toBe(false);
    expect(options.some((option) => option.value === "16:00")).toBe(true);
    expect(options.some((option) => option.value === "22:00")).toBe(true);
    expect(options.at(-1)).toEqual({ value: "23:45", label: "11:45pm" });
  });

  it("coerces invalid end times when start moves later", () => {
    expect(coerceEndTimeAfterStart("09:00", "16:00")).toBe("16:00");
    expect(coerceEndTimeAfterStart("17:00", "16:00")).toBe("18:00");
  });

  it("validates end is after start", () => {
    expect(isEndAfterStart("09:00", "16:00")).toBe(true);
    expect(isEndAfterStart("16:00", "16:00")).toBe(false);
    expect(isEndAfterStart("17:00", "16:00")).toBe(false);
  });

  it("snaps arbitrary values to the grid", () => {
    expect(snapToTimeGrid("10:07")).toBe("10:00");
    expect(snapToTimeGrid("10:08")).toBe("10:15");
  });

  it("uses Calendly-like defaults", () => {
    expect(defaultStartTime()).toBe("09:00");
    expect(defaultEndTime()).toBe("22:00");
    expect(localTimeToMinutes(defaultEndTime())).toBeGreaterThan(
      localTimeToMinutes(defaultStartTime()),
    );
  });

  it("sanitizes rule times for API payloads without changing valid picks", () => {
    expect(sanitizeRuleTimes("09:00", "22:00")).toEqual({
      startLocal: "09:00",
      endLocal: "22:00",
    });
    expect(sanitizeRuleTimes("00:00", "16:15")).toEqual({
      startLocal: "00:00",
      endLocal: "16:15",
    });
  });

  it("throws on invalid ranges instead of silently coercing them", () => {
    expect(() => sanitizeRuleTimes("17:00", "06:00")).toThrow(
      "End time must be after start time on the same day.",
    );
    expect(() => sanitizeRuleTimes("08:00", "00:15")).toThrow(
      "End time must be after start time on the same day.",
    );
  });

  it("coerces invalid end times only for form initialization", () => {
    expect(normalizeRuleTimeRange("17:00", "06:00")).toEqual({
      startLocal: "17:00",
      endLocal: "18:00",
    });
    expect(normalizeRuleTimeRange("23:45", "23:00")).toBeNull();
  });

  it("handles empty and malformed time values", () => {
    expect(normalizeTimeValue("")).toBe("");
    expect(normalizeTimeValue(null)).toBe("");
    expect(normalizeTimeValue("bad")).toBe("bad");
    expect(snapToTimeGrid("")).toBe("09:00");
    expect(coerceEndTimeAfterStart("23:45", "")).toBe("");
  });
});
