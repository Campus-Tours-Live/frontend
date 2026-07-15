import { availabilitySettingsOptions } from "@/lib/data-access/queries/availability-settings.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("availabilitySettingsOptions", () => {
  it("uses the availabilitySettings queryKey", () => {
    expect(availabilitySettingsOptions().queryKey).toEqual(queryKeys.availabilitySettings());
    expect(availabilitySettingsOptions().queryKey).toEqual(["availability-settings"]);
  });

  it("queryFn GETs /v1/availability/settings and returns the resolved value", async () => {
    const payload = { guideId: "g1", acceptanceMode: "AUTO", timezone: "America/Los_Angeles" };
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = availabilitySettingsOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/availability/settings");
    expect(result).toBe(payload);
  });
});
