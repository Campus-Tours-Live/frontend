import { formatLocalTime } from "@/lib/availability/formatTime";

describe("formatLocalTime", () => {
  it("formats morning times in compact am style", () => {
    expect(formatLocalTime("09:00")).toBe("9:00am");
    expect(formatLocalTime("09:15")).toBe("9:15am");
  });

  it("formats afternoon and midnight/noon correctly", () => {
    expect(formatLocalTime("12:00")).toBe("12:00pm");
    expect(formatLocalTime("13:30")).toBe("1:30pm");
    expect(formatLocalTime("00:00")).toBe("12:00am");
  });

  it("returns the original value when parsing fails", () => {
    expect(formatLocalTime("not-a-time")).toBe("not-a-time");
  });
});
