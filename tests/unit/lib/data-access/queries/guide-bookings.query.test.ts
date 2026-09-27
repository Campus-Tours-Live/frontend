import {
  guideBookingOptions,
  guideBookingsOptions,
} from "@/lib/data-access/queries/guide-bookings.query";
import { getDemoGuideBooking } from "@/components/bookings/guideBookingFixtures";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("guideBookingsOptions", () => {
  it("uses the guideBookings queryKey for the filter", () => {
    expect(guideBookingsOptions("pending").queryKey).toEqual(queryKeys.guideBookings("pending"));
    expect(guideBookingsOptions("pending").queryKey).toEqual(["guide-bookings", "pending"]);
  });

  it("queryFn fetches /v1/guide/bookings with the filter", async () => {
    const payload = [{ id: "b1", bookingNumber: "CTL-1" }];
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = guideBookingsOptions("upcoming").queryFn as () => Promise<unknown>;
    const result = (await queryFn()) as { id: string }[];

    expect(mockedApiJson).toHaveBeenCalledWith("/v1/guide/bookings?filter=upcoming");
    expect(result.some((b) => b.id === "b1")).toBe(true);
  });
});

describe("guideBookingOptions", () => {
  it("uses the guideBooking queryKey and fetches one booking", async () => {
    expect(guideBookingOptions("b1").queryKey).toEqual(queryKeys.guideBooking("b1"));
    mockedApiJson.mockResolvedValue({ id: "b1" } as never);

    const queryFn = guideBookingOptions("b1").queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledWith("/v1/guide/bookings/b1");
    expect(result).toEqual({ id: "b1" });
  });

  it("returns demo fixtures without calling the API", async () => {
    const queryFn = guideBookingOptions("demo-confirmed").queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).not.toHaveBeenCalled();
    expect(result).toEqual(getDemoGuideBooking("demo-confirmed"));
  });
});
