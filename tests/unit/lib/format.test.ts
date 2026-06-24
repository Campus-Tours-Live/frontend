import { formatMonthYear, formatOfferingPrice } from "@/lib/format";

describe("formatMonthYear", () => {
  it("renders an ISO timestamp as a spelled-out month + year (en-US)", () => {
    // Mid-month + explicit Z so the local-tz of the test runner can't shift the month.
    expect(formatMonthYear("2025-03-15T00:00:00Z")).toBe("March 2025");
    expect(formatMonthYear("2026-06-15T12:00:00Z")).toBe("June 2026");
  });

  it("returns an em-dash for null / undefined / empty input", () => {
    expect(formatMonthYear(null)).toBe("—");
    expect(formatMonthYear(undefined)).toBe("—");
    expect(formatMonthYear("")).toBe("—");
  });

  it("returns an em-dash for an unparseable value", () => {
    expect(formatMonthYear("not-a-date")).toBe("—");
  });
});

describe("formatOfferingPrice", () => {
  it("formats USD with cents via Intl.NumberFormat (en-US)", () => {
    expect(formatOfferingPrice(4200)).toBe("$42.00");
    expect(formatOfferingPrice(4250)).toBe("$42.50");
  });

  it("formats non-USD currencies with locale-aware symbols", () => {
    expect(formatOfferingPrice(4250, "EUR")).toBe("€42.50");
  });
});
