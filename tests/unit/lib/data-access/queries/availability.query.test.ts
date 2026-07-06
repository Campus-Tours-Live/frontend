import { guideAvailabilityOptions } from "@/lib/data-access/queries/availability.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("guideAvailabilityOptions", () => {
  it("uses the guideAvailability queryKey", () => {
    expect(guideAvailabilityOptions().queryKey).toEqual(queryKeys.guideAvailability());
    expect(guideAvailabilityOptions().queryKey).toEqual(["guide-availability"]);
  });

  it("queryFn fetches /v1/guide/availability and returns the resolved value", async () => {
    const payload = { rules: [], exceptions: [], bookingSettings: {} };
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = guideAvailabilityOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/guide/availability");
    expect(result).toBe(payload);
  });
});
