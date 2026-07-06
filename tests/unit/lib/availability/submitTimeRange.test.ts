import { parseRuleTimeRangeForSubmit } from "@/lib/availability/submitTimeRange";

describe("submitTimeRange", () => {
  it("parses midnight to evening without changing values", () => {
    expect(parseRuleTimeRangeForSubmit("00:00", "16:15")).toEqual({
      startLocal: "00:00",
      endLocal: "16:15",
    });
    expect(parseRuleTimeRangeForSubmit("09:00", "22:00")).toEqual({
      startLocal: "09:00",
      endLocal: "22:00",
    });
  });

  it("rejects invalid ranges instead of coercing them", () => {
    expect(parseRuleTimeRangeForSubmit("08:00", "00:15")).toBeNull();
    expect(parseRuleTimeRangeForSubmit("17:00", "06:00")).toBeNull();
  });
});
