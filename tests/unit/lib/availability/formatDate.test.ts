import {
  formatIsoDateToUs,
  normalizeIsoDateInput,
  parseUsDateToIso,
  todayIsoDate,
} from "@/lib/availability/formatDate";

describe("formatDate", () => {
  it("formats ISO dates as mm/dd/yyyy", () => {
    expect(formatIsoDateToUs("2026-06-01")).toBe("06/01/2026");
    expect(formatIsoDateToUs("2026-12-25")).toBe("12/25/2026");
  });

  it("returns the input unchanged when it isn't a valid ISO date", () => {
    expect(formatIsoDateToUs("not-a-date")).toBe("not-a-date");
  });

  it("parses mm/dd/yyyy into ISO dates", () => {
    expect(parseUsDateToIso("06/01/2026")).toBe("2026-06-01");
    expect(parseUsDateToIso("6/1/2026")).toBe("2026-06-01");
    expect(parseUsDateToIso("2026-06-01")).toBe("2026-06-01");
  });

  it("rejects invalid calendar dates and empty input", () => {
    expect(parseUsDateToIso("02/30/2026")).toBeNull();
    expect(parseUsDateToIso("13/01/2026")).toBeNull();
    expect(parseUsDateToIso("06-01-2026")).toBeNull();
    expect(parseUsDateToIso("")).toBeNull();
    expect(parseUsDateToIso("   ")).toBeNull();
  });

  it("normalizes mixed form input for API submit", () => {
    expect(normalizeIsoDateInput("07/02/2026")).toBe("2026-07-02");
    expect(normalizeIsoDateInput("2026-07-02")).toBe("2026-07-02");
    expect(normalizeIsoDateInput("garbage")).toBeNull();
  });

  it("returns today in local ISO format", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(todayIsoDate()).toBe(expected);
  });
});
