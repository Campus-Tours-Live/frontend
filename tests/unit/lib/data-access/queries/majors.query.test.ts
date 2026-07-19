import { majorOptionsQuery } from "@/lib/data-access/queries/majors.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("majorOptionsQuery", () => {
  it("uses the majors queryKey, keyed by schoolId", () => {
    expect(majorOptionsQuery("243744").queryKey).toEqual(queryKeys.majors("243744"));
    expect(majorOptionsQuery("243744").queryKey).toEqual(["majors", "243744"]);
  });

  it("never goes stale within a session (staleTime: Infinity)", () => {
    expect(majorOptionsQuery("243744").staleTime).toBe(Infinity);
  });

  it("is enabled when schoolId is non-empty", () => {
    expect(majorOptionsQuery("243744").enabled).toBe(true);
  });

  it("is disabled when schoolId is empty", () => {
    expect(majorOptionsQuery("").enabled).toBe(false);
  });

  it("queryFn fetches /v1/meta/majors with URL-encoded schoolId and the signal, returning the resolved value", async () => {
    const payload = [{ value: "CS", label: "Computer Science" }];
    mockedApiJson.mockResolvedValue(payload as never);

    const signal = new AbortController().signal;
    const queryFn = majorOptionsQuery("stan ford&co").queryFn as (ctx: {
      signal: AbortSignal;
    }) => Promise<unknown>;
    const result = await queryFn({ signal });

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/meta/majors?schoolId=stan%20ford%26co", {
      signal,
    });
    expect(result).toBe(payload);
  });
});
