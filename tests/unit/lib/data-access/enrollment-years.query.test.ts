import {
  enrollmentYearRulesSchema,
  enrollmentYearsQuery,
} from "@/lib/data-access/queries/enrollment-years.query";
import { apiJson } from "@/lib/data-access/http";

jest.mock("@/lib/data-access/http", () => ({ apiJson: jest.fn() }));

const mockedApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

beforeEach(() => {
  mockedApiJson.mockReset();
});

describe("enrollmentYearRulesSchema", () => {
  const valid = {
    entryYear: { min: 2016, max: 2027 },
    maxYearsToGraduate: [
      { matches: ["doctor", "first professional"], years: 9 },
      { matches: ["bachelor"], years: 6 },
    ],
    defaultMaxYearsToGraduate: 8,
  };

  it("parses the real payload shape", () => {
    const parsed = enrollmentYearRulesSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("PRESERVES rule order — order is the contract, first hit wins", () => {
    const parsed = enrollmentYearRulesSchema.parse(valid);
    expect(parsed.maxYearsToGraduate[0].years).toBe(9);
    expect(parsed.maxYearsToGraduate[1].years).toBe(6);
  });

  it("fails closed on a malformed payload rather than guessing a window", () => {
    expect(enrollmentYearRulesSchema.safeParse({}).success).toBe(false);
    expect(
      enrollmentYearRulesSchema.safeParse({ ...valid, entryYear: { min: 2016 } }).success,
    ).toBe(false);
    expect(
      enrollmentYearRulesSchema.safeParse({ ...valid, maxYearsToGraduate: "nope" }).success,
    ).toBe(false);
  });

  /**
   * Type-correct but semantically impossible payloads. A schema that only checks types accepts
   * all of these, and the empty-keyword case is the dangerous one: `"anything".includes("")` is
   * true, so one empty string makes its group match EVERY degree and silently swallow the table.
   */
  it("rejects type-correct payloads that cannot be meaningful", () => {
    expect(
      enrollmentYearRulesSchema.safeParse({ ...valid, entryYear: { min: 2028, max: 2016 } })
        .success,
    ).toBe(false);
    expect(
      enrollmentYearRulesSchema.safeParse({
        ...valid,
        maxYearsToGraduate: [{ matches: [""], years: 6 }],
      }).success,
    ).toBe(false);
    // A single space is the same bug in disguise: "Doctoral Degree".includes(" ") is true.
    expect(
      enrollmentYearRulesSchema.safeParse({
        ...valid,
        maxYearsToGraduate: [{ matches: ["   "], years: 6 }],
      }).success,
    ).toBe(false);
    // Upper-case keywords could never match, since the client lowercases before comparing.
    expect(
      enrollmentYearRulesSchema.safeParse({
        ...valid,
        maxYearsToGraduate: [{ matches: ["Bachelor"], years: 6 }],
      }).success,
    ).toBe(false);
    expect(
      enrollmentYearRulesSchema.safeParse({
        ...valid,
        maxYearsToGraduate: [{ matches: ["bachelor"], years: 0 }],
      }).success,
    ).toBe(false);
    expect(enrollmentYearRulesSchema.safeParse({ ...valid, maxYearsToGraduate: [] }).success).toBe(
      false,
    );
  });

  /**
   * staleTime marks data stale; it does not fetch. With the provider's global
   * refetchOnWindowFocus: false, an open form would otherwise keep last year's window forever
   * (spec I6). These options are the mechanism, so they are asserted rather than assumed.
   */
  it("re-asks on an interval and on focus, so an open form cannot keep last year's rules", () => {
    const options = enrollmentYearsQuery();
    expect(options.staleTime).toBe(60 * 60 * 1000);
    expect(options.refetchInterval).toBe(60 * 60 * 1000);
    expect(options.refetchIntervalInBackground).toBe(false);
    expect(options.refetchOnWindowFocus).toBe(true);
  });
});

describe("enrollmentYearsQuery queryFn", () => {
  it("fetches /v1/meta/enrollment-years with the signal and returns the parsed payload", async () => {
    const payload = {
      entryYear: { min: 2016, max: 2027 },
      maxYearsToGraduate: [{ matches: ["bachelor"], years: 6 }],
      defaultMaxYearsToGraduate: 8,
    };
    mockedApiJson.mockResolvedValue(payload as never);

    const signal = new AbortController().signal;
    const queryFn = enrollmentYearsQuery().queryFn as (ctx: {
      signal: AbortSignal;
    }) => Promise<unknown>;
    const result = await queryFn({ signal });

    expect(mockedApiJson).toHaveBeenCalledTimes(1);
    expect(mockedApiJson).toHaveBeenCalledWith("/v1/meta/enrollment-years", { signal });
    expect(result).toEqual(payload);
  });

  /**
   * Pins "fails closed" at the query boundary, not just the schema boundary: the schema tests
   * above prove `enrollmentYearRulesSchema` rejects a malformed payload, but only this proves the
   * query's `queryFn` doesn't swallow that rejection (e.g. via a stray `.safeParse(...).data!`) —
   * it must propagate as a rejected promise so the query enters its error state.
   */
  it("rejects when apiJson resolves a malformed payload, rather than swallowing the parse failure", async () => {
    mockedApiJson.mockResolvedValue({ nope: true } as never);

    const signal = new AbortController().signal;
    const queryFn = enrollmentYearsQuery().queryFn as (ctx: {
      signal: AbortSignal;
    }) => Promise<unknown>;

    await expect(queryFn({ signal })).rejects.toThrow();
  });
});
