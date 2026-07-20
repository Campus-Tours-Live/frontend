import { keepPreviousData } from "@tanstack/react-query";
import { universitySearchOptions } from "@/lib/data-access/queries/universities.query";
import { apiJson } from "@/lib/data-access/http";
import { queryKeys } from "@/lib/data-access/keys";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("universitySearchOptions", () => {
  it.each(["mit", "stan ford", "a&b"] as const)(
    "uses the universitySearch queryKey for query %s",
    (q) => {
      expect(universitySearchOptions(q, true).queryKey).toEqual([
        ...queryKeys.universitySearch(q),
        "catalog",
      ]);
      expect(universitySearchOptions(q, true).queryKey).toEqual([
        "university-search",
        q,
        "catalog",
      ]);
      expect(universitySearchOptions(q, true, "live").queryKey).toEqual([
        "university-search",
        q,
        "live",
      ]);
    },
  );

  it("forwards the enabled flag", () => {
    expect(universitySearchOptions("mit", true).enabled).toBe(true);
    expect(universitySearchOptions("mit", false).enabled).toBe(false);
  });

  it("sets placeholderData to keepPreviousData", () => {
    expect(universitySearchOptions("mit", true).placeholderData).toBe(keepPreviousData);
  });

  it("queryFn fetches /v1/universities with URL-encoded query, limit=8 and the signal", async () => {
    const payload = [{ id: "u1" }];
    mockedApiJson.mockResolvedValue(payload as never);

    const signal = new AbortController().signal;
    const queryFn = universitySearchOptions("stan ford", true).queryFn as (ctx: {
      signal: AbortSignal;
    }) => Promise<unknown>;
    const result = await queryFn({ signal });

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/universities?q=stan%20ford&limit=8", {
      signal,
    });
    expect(result).toBe(payload);
  });

  it("live source fetches /v1/meta/universities (interactive:false) and adapts { value, label } to University", async () => {
    mockedApiJson.mockResolvedValue([
      { value: "243744", label: "Stanford — Stanford, CA" },
    ] as never);

    const signal = new AbortController().signal;
    const queryFn = universitySearchOptions("stanford", true, "live").queryFn as (ctx: {
      signal: AbortSignal;
    }) => Promise<unknown>;
    const result = await queryFn({ signal });

    // interactive:false — this ambient public read must return a 401 to the caller, not pop the
    // reauth modal (matches the meta-query convention; a logged-out visitor may hit it).
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/meta/universities?q=stanford", {
      signal,
      interactive: false,
    });
    expect(result).toEqual([
      { id: "243744", name: "Stanford — Stanford, CA", shortName: null, city: null, region: null },
    ]);
  });
});
