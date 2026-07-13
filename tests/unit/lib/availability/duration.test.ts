import { formatDuration, formatWindow, isValidWindowMin } from "@/lib/availability/duration";

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
