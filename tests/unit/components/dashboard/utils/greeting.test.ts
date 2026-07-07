import { dashboardGreeting } from "@/components/dashboard/utils/greeting";

function mockHour(hour: number) {
  jest.spyOn(Date.prototype, "getHours").mockReturnValue(hour);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("dashboardGreeting", () => {
  it("combines the time-of-day greeting with the name", () => {
    mockHour(8);
    expect(dashboardGreeting("Maya")).toBe("Good morning, Maya");
  });

  it("reflects the time of day", () => {
    mockHour(20);
    expect(dashboardGreeting("Maya")).toBe("Good evening, Maya");
  });

  it.each([[null], [undefined], [""], ["   "]])("falls back to 'there' when name is %p", (name) => {
    mockHour(9);
    expect(dashboardGreeting(name)).toBe("Good morning, there");
  });

  it("trims surrounding whitespace on the name", () => {
    mockHour(9);
    expect(dashboardGreeting("  Maya  ")).toBe("Good morning, Maya");
  });
});
