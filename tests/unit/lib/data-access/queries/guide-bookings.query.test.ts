import {
  guideBookingOptions,
  guideBookingsOptions,
} from "@/lib/data-access/queries/guide-bookings.query";
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
    const payload = [{ id: "b1" }];
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = guideBookingsOptions("upcoming").queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledWith("/v1/guide/bookings?filter=upcoming");
    expect(result).toBe(payload);
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
});
