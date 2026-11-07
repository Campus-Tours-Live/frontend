import {
  demoGuideBookingsForFilter,
  getDemoGuideBooking,
  isDemoGuideBookingId,
} from "@/components/bookings/guideBookingFixtures";
import {
  demoGuideBookingsEnabled,
  mergeDemoGuideBookings,
} from "@/components/bookings/guideBookingDemo";

function withNodeEnv<T>(value: "development" | "production" | "test", run: () => T): T {
  const restore = jest.replaceProperty(process, "env", {
    ...process.env,
    NODE_ENV: value,
  }).restore;
  try {
    return run();
  } finally {
    restore();
  }
}

describe("guideBookingDemo", () => {
  it("identifies demo booking ids", () => {
    expect(isDemoGuideBookingId("demo-pending")).toBe(true);
    expect(isDemoGuideBookingId("b1")).toBe(false);
  });

  it("returns fixtures by id", () => {
    const booking = getDemoGuideBooking("demo-confirmed");
    expect(booking?.offeringTitle).toBe("Engineering tour & labs");
    expect(booking?.statusHistory?.length).toBeGreaterThan(0);
  });

  it("filters demo bookings by inbox filter", () => {
    expect(demoGuideBookingsForFilter("pending")).toHaveLength(1);
    expect(demoGuideBookingsForFilter("upcoming")).toHaveLength(2);
    expect(demoGuideBookingsForFilter("past").length).toBeGreaterThanOrEqual(3);
    expect(demoGuideBookingsForFilter("past").some((b) => b.id === "demo-overdue")).toBe(true);
    expect(demoGuideBookingsForFilter("past").some((b) => b.id === "demo-completed")).toBe(true);
    expect(demoGuideBookingsForFilter("all")).toHaveLength(3);
  });

  it("merges demos only in development", () => {
    const remote = [{ id: "real-1", bookingNumber: "CTL-1" } as never];
    const merged = withNodeEnv("development", () => mergeDemoGuideBookings("all", remote));

    expect(merged.length).toBeGreaterThan(1);
    expect(merged.some((b) => b.id === "real-1")).toBe(true);
    expect(merged.some((b) => b.id === "demo-pending")).toBe(true);
  });

  it("does not merge demos in production", () => {
    const remote = [{ id: "real-1", bookingNumber: "CTL-1" } as never];
    const merged = withNodeEnv("production", () => mergeDemoGuideBookings("all", remote));
    expect(merged).toEqual(remote);
  });

  it("reports demo mode from NODE_ENV", () => {
    expect(withNodeEnv("development", () => demoGuideBookingsEnabled())).toBe(true);
    expect(withNodeEnv("production", () => demoGuideBookingsEnabled())).toBe(false);
  });
});
