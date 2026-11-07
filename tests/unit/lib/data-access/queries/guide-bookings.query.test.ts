import { guideBookingsOptions } from "@/lib/data-access/queries/guide-bookings.query";
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
