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
    "uses the universitySearch queryKey (always the live suffix) for query %s",
    (q) => {
      expect(universitySearchOptions(q, true).queryKey).toEqual([
        ...queryKeys.universitySearch(q),
        "live",
      ]);
      expect(universitySearchOptions(q, true).queryKey).toEqual(["university-search", q, "live"]);
      // The (retained-but-ignored) `_source` param no longer changes the key — every lookup goes
      // to the live directory now that the catalog branch is gone.
      expect(universitySearchOptions(q, true, "catalog").queryKey).toEqual([
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

  it("queryFn fetches /v1/meta/universities (escalate: none) and adapts { value, label } to University", async () => {
    mockedApiJson.mockResolvedValue([
      { value: "243744", label: "Stanford — Stanford, CA" },
    ] as never);

    const signal = new AbortController().signal;
    const queryFn = universitySearchOptions("stanford", true).queryFn as (ctx: {
      signal: AbortSignal;
    }) => Promise<unknown>;
    const result = await queryFn({ signal });

    // escalate: none — this ambient public read must return a 401 to the caller, not pop the
    // reauth modal (matches the meta-query convention; a logged-out visitor may hit it).
    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/meta/universities?q=stanford", {
      signal,
      escalate: "none",
    });
    expect(result).toEqual([
      { id: "243744", name: "Stanford — Stanford, CA", shortName: null, city: null, region: null },
    ]);
  });

  it("URL-encodes the query", async () => {
    mockedApiJson.mockResolvedValue([] as never);

    const signal = new AbortController().signal;
    const queryFn = universitySearchOptions("stan ford", true).queryFn as (ctx: {
      signal: AbortSignal;
    }) => Promise<unknown>;
    await queryFn({ signal });

    expect(mockedApiJson).toHaveBeenCalledWith("/v1/meta/universities?q=stan%20ford", {
      signal,
      escalate: "none",
    });
  });
});
