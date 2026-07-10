import { isValidIanaTimeZone, listIanaTimeZones } from "@/lib/availability/timezones";

describe("timezones", () => {
  it("lists known IANA zones", () => {
    const zones = listIanaTimeZones();
    expect(zones.length).toBeGreaterThan(0);
    expect(zones).toContain("America/Los_Angeles");
  });

  it("validates IANA zone ids", () => {
    expect(isValidIanaTimeZone("America/Los_Angeles")).toBe(true);
    expect(isValidIanaTimeZone("America/Los_Angles")).toBe(false);
    expect(isValidIanaTimeZone("")).toBe(false);
  });
});
