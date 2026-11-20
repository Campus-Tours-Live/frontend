import { bookingHistoryOptions } from "@/lib/data-access/queries/booking-history.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("bookingHistoryOptions", () => {
  it("uses the bookingHistory queryKey", () => {
    expect(bookingHistoryOptions().queryKey).toEqual(queryKeys.bookingHistory());
    expect(bookingHistoryOptions().queryKey).toEqual(["booking-history"]);
  });

  it("queryFn fetches /v1/bookings/history and returns the resolved value", async () => {
    const payload = [{ id: "bk_1", status: "COMPLETED" }];
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = bookingHistoryOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/bookings/history");
    expect(result).toBe(payload);
  });
});
