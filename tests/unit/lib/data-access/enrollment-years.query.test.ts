import {
  enrollmentYearRulesSchema,
  enrollmentYearsQuery,
} from "@/lib/data-access/queries/enrollment-years.query";

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
    expect(options.refetchOnWindowFocus).toBe(true);
  });
});
