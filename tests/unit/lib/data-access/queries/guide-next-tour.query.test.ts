import { guideNextTourOptions } from "@/lib/data-access/queries/guide-next-tour.query";
import { apiJson } from "@/lib/data-access/http";
import type { GuideBooking } from "@/lib/data-access";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));
const api = jest.mocked(apiJson);
const booking = (id: string, scheduledAt: string, status = "CONFIRMED") =>
  ({ id, scheduledAt, status }) as GuideBooking;
const fetchNext = () => (guideNextTourOptions().queryFn as () => Promise<GuideBooking | null>)();

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-02T12:00:00Z"));
  api.mockReset();
});
afterEach(() => jest.restoreAllMocks());

it("uses a separate cache under the booking mutation invalidation prefix", () => {
  expect(guideNextTourOptions().queryKey).toEqual(["guide-bookings", "next-tour"]);
});

it("selects the earliest future confirmed tour without mutating the response", async () => {
  const rows = [
    booking("later", "2026-10-04T12:00:00Z"),
    booking("past", "2026-10-01T12:00:00Z"),
    booking("pending", "2026-10-02T13:00:00Z", "WAITING_FOR_GUIDE"),
    booking("cancelled", "2026-10-02T13:00:00Z", "CANCELLED"),
    booking("invalid", "invalid"),
    booking("next", "2026-10-03T12:00:00Z"),
  ];
  api.mockResolvedValue(rows);
  expect(await fetchNext()).toEqual(rows[5]);
  expect(rows[0].id).toBe("later");
  expect(api).toHaveBeenCalledWith("/v1/guide/bookings?filter=upcoming");
});

it("includes a booking starting now", async () => {
  const next = booking("now", "2026-10-02T12:00:00Z");
  api.mockResolvedValue([next]);
  expect(await fetchNext()).toEqual(next);
});

it("returns null for an empty real schedule without inserting demo bookings", async () => {
  api.mockResolvedValue([]);
  expect(await fetchNext()).toBeNull();
});

it("does not convert request failures into an empty schedule", async () => {
  api.mockRejectedValue(new Error("offline"));
  await expect(fetchNext()).rejects.toThrow("offline");
});

it("re-evaluates elapsed tours on refresh", async () => {
  api.mockResolvedValue([booking("next", "2026-10-03T12:00:00Z")]);
  expect(await fetchNext()).not.toBeNull();
  jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-04T12:00:00Z"));
  expect(await fetchNext()).toBeNull();
});
