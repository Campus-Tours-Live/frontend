import {
  CUSTOM_DURATION_VALUE,
  DURATION_PRESETS,
  formatDuration,
  formatWindow,
  isValidWindowMin,
  minutesToPresetValue,
  presetValueToMinutes,
} from "@/lib/availability/duration";

describe("duration presets", () => {
  it("round-trips every preset between its id and windowMin", () => {
    for (const preset of DURATION_PRESETS) {
      expect(minutesToPresetValue(preset.minutes)).toBe(preset.value);
      expect(presetValueToMinutes(preset.value)).toBe(preset.minutes);
    }
  });

  it("maps a 4h preset to windowMin 240 and back", () => {
    expect(presetValueToMinutes("240")).toBe(240);
    expect(minutesToPresetValue(240)).toBe("240");
  });

  it("falls back to 'custom' for a windowMin that isn't a preset", () => {
    expect(minutesToPresetValue(75)).toBe(CUSTOM_DURATION_VALUE);
    expect(minutesToPresetValue(1)).toBe(CUSTOM_DURATION_VALUE);
  });

  it("resolves custom minutes from the picker's free-text input", () => {
    expect(presetValueToMinutes(CUSTOM_DURATION_VALUE, "75")).toBe(75);
    expect(presetValueToMinutes(CUSTOM_DURATION_VALUE, 45)).toBe(45);
  });

  it("rejects invalid custom minutes instead of coercing them", () => {
    expect(presetValueToMinutes(CUSTOM_DURATION_VALUE)).toBeNull();
    expect(presetValueToMinutes(CUSTOM_DURATION_VALUE, "")).toBeNull();
    expect(presetValueToMinutes(CUSTOM_DURATION_VALUE, "0")).toBeNull();
    expect(presetValueToMinutes(CUSTOM_DURATION_VALUE, "-30")).toBeNull();
    expect(presetValueToMinutes(CUSTOM_DURATION_VALUE, "abc")).toBeNull();
    expect(presetValueToMinutes(CUSTOM_DURATION_VALUE, "12.5")).toBeNull();
  });

  it("rejects an unknown preset id", () => {
    expect(presetValueToMinutes("not-a-real-preset")).toBeNull();
  });
});

describe("isValidWindowMin", () => {
  it("accepts only positive integers", () => {
    expect(isValidWindowMin(240)).toBe(true);
    expect(isValidWindowMin(1)).toBe(true);
    expect(isValidWindowMin(0)).toBe(false);
    expect(isValidWindowMin(-15)).toBe(false);
    expect(isValidWindowMin(12.5)).toBe(false);
    expect(isValidWindowMin(Number.NaN)).toBe(false);
    expect(isValidWindowMin("240")).toBe(false);
  });

  it("has no 24:00 sentinel or wraparound special-casing", () => {
    // 1440 (24h) and beyond are just plain minute counts — no sentinel value is rejected or
    // special-cased; the model has no notion of "end of day".
    expect(isValidWindowMin(1440)).toBe(true);
    expect(isValidWindowMin(1441)).toBe(true);
  });
});

describe("formatDuration", () => {
  it("formats whole hours, whole minutes, and mixed durations", () => {
    expect(formatDuration(240)).toBe("4h");
    expect(formatDuration(30)).toBe("30m");
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(75)).toBe("1h 15m");
  });

  it("round-trips formatDuration(minutesToPresetValue(x) -> preset.minutes) for every preset", () => {
    for (const preset of DURATION_PRESETS) {
      expect(formatDuration(preset.minutes)).toBe(
        formatDuration(presetValueToMinutes(preset.value)!),
      );
    }
  });

  it("returns an empty string for invalid input", () => {
    expect(formatDuration(0)).toBe("");
    expect(formatDuration(-5)).toBe("");
    expect(formatDuration(Number.NaN)).toBe("");
  });
});

describe("formatWindow", () => {
  it("combines a 12-hour start time with the duration, e.g. '10:00 AM · 4h'", () => {
    expect(formatWindow("10:00", 240)).toBe("10:00 AM · 4h");
  });

  it("renders PM for afternoon/evening starts", () => {
    expect(formatWindow("22:00", 90)).toBe("10:00 PM · 1h 30m");
    expect(formatWindow("13:05", 30)).toBe("1:05 PM · 30m");
  });

  it("renders midnight as 12:00 AM and noon as 12:00 PM", () => {
    expect(formatWindow("00:00", 30)).toBe("12:00 AM · 30m");
    expect(formatWindow("12:00", 60)).toBe("12:00 PM · 1h");
  });

  it("falls back to the raw startLocal when it doesn't parse as HH:mm", () => {
    expect(formatWindow("garbage", 60)).toBe("garbage · 1h");
  });
});
