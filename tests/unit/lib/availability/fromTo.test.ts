import { formatFromTo, toWindowMin, windowToTo } from "@/lib/availability/fromTo";

describe("toWindowMin", () => {
  it("computes windowMin between two same-day HH:mm times", () => {
    expect(toWindowMin("09:00", "13:00")).toBe(240);
  });

  it("allows to='24:00' (the midnight/end-of-day sentinel)", () => {
    expect(toWindowMin("22:00", "24:00")).toBe(120);
  });

  it("throws when to <= from (and to is not the 24:00 sentinel)", () => {
    expect(() => toWindowMin("10:00", "09:00")).toThrow();
    expect(() => toWindowMin("10:00", "10:00")).toThrow();
  });

  it("rejects a same-day range that would need to cross midnight", () => {
    // From 22:00, the only same-day endpoint is 24:00 (a 120min window). Any other
    // (raw HH:mm) "to" that would represent "past midnight" is <= "22:00" as a plain
    // clock value and so is rejected by the to<=from guard — same-day only, option A.
    expect(() => toWindowMin("22:00", "00:01")).toThrow();
    expect(() => toWindowMin("22:00", "01:00")).toThrow();
  });

  it("throws when the implied window would still exceed 1440 minutes total", () => {
    // A malformed "to" past the 24:00 sentinel (e.g. "25:00") is not caught by the
    // to<=from guard but must still be rejected — no cross-midnight, ever.
    expect(() => toWindowMin("22:00", "25:00")).toThrow();
  });
});

describe("windowToTo", () => {
  it("returns the 12-hour label for the end of a window", () => {
    expect(windowToTo("09:00", 240)).toBe("1:00 PM");
  });

  it("returns the '12:00 AM' label when startLocal + windowMin === 1440 (midnight)", () => {
    expect(windowToTo("22:00", 120)).toBe("12:00 AM");
  });

  it("renders noon as 12:00 PM (hour % 12 === 0 case, not the 1440 sentinel)", () => {
    expect(windowToTo("11:00", 60)).toBe("12:00 PM");
  });
});

describe("formatFromTo", () => {
  it('formats a same-day morning-to-afternoon range, e.g. "9:00 AM – 1:00 PM"', () => {
    expect(formatFromTo("09:00", 240)).toBe("9:00 AM – 1:00 PM");
  });

  it('formats a range that ends exactly at midnight, e.g. "10:00 PM – 12:00 AM"', () => {
    expect(formatFromTo("22:00", 120)).toBe("10:00 PM – 12:00 AM");
  });
});
