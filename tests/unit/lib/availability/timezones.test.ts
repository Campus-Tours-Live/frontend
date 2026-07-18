import { formatTimezoneLabel, isValidTimezone } from "@/lib/availability/timezones";

describe("isValidTimezone", () => {
  it("accepts a canonical IANA zone", () => {
    expect(isValidTimezone("America/Los_Angeles")).toBe(true);
  });

  it("accepts IANA aliases a canonical-only whitelist would reject", () => {
    expect(isValidTimezone("US/Pacific")).toBe(true);
    expect(isValidTimezone("Asia/Calcutta")).toBe(true);
  });

  it("rejects garbage / non-zone strings", () => {
    expect(isValidTimezone("Not/AZone")).toBe(false);
  });

  it("rejects the empty string", () => {
    expect(isValidTimezone("")).toBe(false);
  });
});

describe("formatTimezoneLabel", () => {
  it("replaces underscores with spaces for a friendlier label", () => {
    expect(formatTimezoneLabel("America/Los_Angeles")).toBe("America/Los Angeles");
  });

  it("passes through zones with no underscores unchanged", () => {
    expect(formatTimezoneLabel("US/Pacific")).toBe("US/Pacific");
  });
});
