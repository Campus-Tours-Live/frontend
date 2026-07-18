import { resolvedAvailabilityOptions } from "@/lib/data-access/queries/resolved-availability.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("resolvedAvailabilityOptions", () => {
  it("uses the availabilityResolved queryKey", () => {
    expect(resolvedAvailabilityOptions().queryKey).toEqual(queryKeys.availabilityResolved());
    expect(resolvedAvailabilityOptions().queryKey).toEqual(["availability-resolved"]);
  });

  it("queryFn GETs /v1/availability and returns { rules, occurrences, dstGapDays }", async () => {
    const payload = {
      rules: [{ id: "r1" }],
      occurrences: [{ startAt: "2026-07-12T05:00:00Z", endAt: "2026-07-12T13:00:00Z" }],
      dstGapDays: ["2026-03-08"],
    };
    mockedApiJson.mockResolvedValue(payload as never);

    const queryFn = resolvedAvailabilityOptions().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/availability");
    expect(result).toBe(payload);
  });
});
