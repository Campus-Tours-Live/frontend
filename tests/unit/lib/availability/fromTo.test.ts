import {
  buildToOptions,
  formatClockLabel,
  formatFromTo,
  minutesFromHHmm,
  toWindowMin,
  windowToRawTo,
  windowToTo,
} from "@/lib/availability/fromTo";

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

  it('throws on a malformed "to" instead of silently returning NaN (T1 review Minor)', () => {
    // Previously `parseHHmm` did `Number("ab")*60+Number("cd")` → NaN, which slipped through
    // both numeric guards below (NaN <= x and x + NaN > 1440 are both false) and returned NaN.
    expect(() => toWindowMin("09:00", "ab:cd")).toThrow();
  });

  it('throws on a malformed "from" the same way', () => {
    expect(() => toWindowMin("ab:cd", "10:00")).toThrow();
  });

  it("throws on an out-of-range HH:mm (hour/minute outside 0-23/0-59)", () => {
    expect(() => toWindowMin("09:00", "24:61")).toThrow();
    expect(() => toWindowMin("09:99", "10:00")).toThrow();
  });

  it('still allows the "24:00" sentinel through unaffected by the hardened parser', () => {
    expect(toWindowMin("00:00", "24:00")).toBe(1440);
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

describe("windowToRawTo", () => {
  it("returns the raw HH:mm end of a window (not a 12-hour label)", () => {
    expect(windowToRawTo("09:00", 240)).toBe("13:00");
  });

  it('returns the "24:00" sentinel — not "00:00" — when startLocal + windowMin === 1440', () => {
    expect(windowToRawTo("22:00", 120)).toBe("24:00");
  });

  it("round-trips through toWindowMin (the whole point — windowToTo's label cannot)", () => {
    expect(toWindowMin("09:00", windowToRawTo("09:00", 240))).toBe(240);
    expect(toWindowMin("22:00", windowToRawTo("22:00", 120))).toBe(120);
  });
});

describe("minutesFromHHmm", () => {
  it("parses a plain HH:mm clock time into minutes-from-midnight", () => {
    expect(minutesFromHHmm("13:00")).toBe(780);
    expect(minutesFromHHmm("00:15")).toBe(15);
  });
});

describe("formatClockLabel", () => {
  it('formats a plain HH:mm clock time as a 12-hour label, e.g. "13:00" -> "1:00 PM"', () => {
    expect(formatClockLabel("13:00")).toBe("1:00 PM");
    expect(formatClockLabel("00:15")).toBe("12:15 AM");
    expect(formatClockLabel("09:00")).toBe("9:00 AM");
  });
});

describe("buildToOptions (shared to-picker builder, hoisted from DayHoursModal/DateOverrideModal)", () => {
  it('includes the "24:00" midnight/end-of-day option labelled "12:00 AM (midnight)"', () => {
    const options = buildToOptions("13:00");
    expect(options).toContainEqual({ value: "24:00", label: "12:00 AM (midnight)" });
  });

  it('does NOT include a "00:00" option (N1: ambiguous duplicate of the "24:00" end-of-day option)', () => {
    const options = buildToOptions("13:00");
    expect(options.some((option) => option.value === "00:00")).toBe(false);
  });

  it('does not (re-)introduce a "00:00" option even when "current" is passed as "00:00"', () => {
    const options = buildToOptions("00:00");
    expect(options.some((option) => option.value === "00:00")).toBe(false);
  });

  it('the grid\'s earliest option (excluding the "24:00" sentinel) is "00:15"', () => {
    const options = buildToOptions("13:00").filter((option) => option.value !== "24:00");
    const values = options.map((option) => option.value).sort();
    expect(values[0]).toBe("00:15");
  });

  it('folds an off-grid "current" value into the options so it has a matching <option>', () => {
    const options = buildToOptions("13:07");
    expect(options).toContainEqual({ value: "13:07", label: formatClockLabel("13:07") });
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
