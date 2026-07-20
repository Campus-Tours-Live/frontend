import { tourFeatureOptionsQuery } from "@/lib/data-access/queries/tour-features.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("tourFeatureOptionsQuery", () => {
  it("uses the tourFeatures queryKey", () => {
    expect(tourFeatureOptionsQuery().queryKey).toEqual(queryKeys.tourFeatures());
    expect(tourFeatureOptionsQuery().queryKey).toEqual(["tour-features"]);
  });

  it("never goes stale within a session (staleTime: Infinity)", () => {
    expect(tourFeatureOptionsQuery().staleTime).toBe(Infinity);
  });

  it("queryFn fetches /v1/meta/tour-features with escalate: none and returns the resolved value", async () => {
    const payload = {
      ACCESSIBILITY: [{ value: "WHEELCHAIR", label: "Wheelchair accessible" }],
    };
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = tourFeatureOptionsQuery().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/meta/tour-features", { escalate: "none" });
    expect(result).toBe(payload);
  });
});
