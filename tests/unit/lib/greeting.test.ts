import { getTimeGreeting } from "@/lib/greeting";

function mockHour(hour: number) {
  jest.spyOn(Date.prototype, "getHours").mockReturnValue(hour);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("getTimeGreeting", () => {
  it.each([
    [0, "Good evening"], // just after midnight — still night, not morning
    [4, "Good evening"], // boundary: last pre-morning hour
    [5, "Good morning"], // boundary: first morning hour
    [8, "Good morning"],
    [11, "Good morning"], // boundary: last morning hour
    [12, "Good afternoon"], // boundary: first afternoon hour
    [14, "Good afternoon"],
    [16, "Good afternoon"], // boundary: last afternoon hour
    [17, "Good evening"], // boundary: first evening hour
    [20, "Good evening"],
    [23, "Good evening"],
  ])("hour %i -> %s", (hour, expected) => {
    mockHour(hour);
    expect(getTimeGreeting()).toBe(expected);
  });
});
