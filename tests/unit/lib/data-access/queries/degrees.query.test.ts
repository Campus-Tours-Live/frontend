import { degreeOptionsQuery } from "@/lib/data-access/queries/degrees.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("degreeOptionsQuery", () => {
  it("uses the degrees queryKey, keyed by schoolId", () => {
    expect(degreeOptionsQuery("243744").queryKey).toEqual(queryKeys.degrees("243744"));
    expect(degreeOptionsQuery("243744").queryKey).toEqual(["degrees", "243744"]);
  });

  it("never goes stale within a session (staleTime: Infinity)", () => {
    expect(degreeOptionsQuery("243744").staleTime).toBe(Infinity);
  });

  it("is enabled when schoolId is non-empty", () => {
    expect(degreeOptionsQuery("243744").enabled).toBe(true);
  });

  it("is disabled when schoolId is empty", () => {
    expect(degreeOptionsQuery("").enabled).toBe(false);
  });

  it("queryFn fetches /v1/meta/degrees with URL-encoded schoolId and the signal, returning the resolved value", async () => {
    const payload = [{ value: "Bachelor's Degree", label: "Bachelor's Degree" }];
    mockedApiJson.mockResolvedValue(payload as never);

    const signal = new AbortController().signal;
    const queryFn = degreeOptionsQuery("stan ford&co").queryFn as (ctx: {
      signal: AbortSignal;
    }) => Promise<unknown>;
    const result = await queryFn({ signal });

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/meta/degrees?schoolId=stan%20ford%26co", {
      signal,
    });
    expect(result).toBe(payload);
  });
});
