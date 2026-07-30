import {
  classYearRange,
  maxYearsToGraduate,
  validateClassYear,
  validateEntryYear,
} from "@/components/signup/enrollmentYears";
import type { EnrollmentYearRules } from "@/lib/data-access/types";

/** The exact table the server serves — mirrored so a drift in either shows up here. */
const RULES: EnrollmentYearRules = {
  entryYear: { min: 2016, max: 2027 },
  maxYearsToGraduate: [
    { matches: ["doctor", "first professional"], years: 9 },
    { matches: ["master", "post-baccalaureate"], years: 3 },
    { matches: ["bachelor"], years: 6 },
    { matches: ["associate", "certificate", "diploma"], years: 3 },
  ],
  defaultMaxYearsToGraduate: 8,
};

describe("maxYearsToGraduate", () => {
  /**
   * I7 — the identical case table the Java side asserts against
   * (EnrollmentYearRulesTest.maxYearsToGraduate_mapsEachCredentialLevelAndDefault). If these two
   * lists ever diverge, the two implementations have diverged.
   */
  it.each([
    ["Doctoral Degree", 9],
    ["First Professional Degree", 9],
    ["Master's Degree", 3],
    ["Post-baccalaureate Certificate", 3],
    ["Bachelor's Degree", 6],
    ["Associate's Degree", 3],
    ["Undergraduate Certificate", 3],
    ["Diploma", 3],
    ["Some Other Credential", 8],
    // The Java suite carries these to pin Locale.ROOT lowercasing (a Turkish default locale maps
    // "I" to "ı" and would break `DIPLOMA`). JS's toLowerCase() is locale-independent by
    // definition, so we are not exposed to that bug — but the tables must stay identical for the
    // comment above to be true, and a divergence here is exactly what this file exists to catch.
    ["FIRST PROFESSIONAL DEGREE", 9],
    ["DIPLOMA", 3],
    ["UNDERGRADUATE CERTIFICATE", 3],
  ])("maps %s to %i", (degree, years) => {
    expect(maxYearsToGraduate(RULES, degree as string)).toBe(years);
  });

  it("falls back to the default for an absent degree", () => {
    expect(maxYearsToGraduate(RULES, undefined)).toBe(8);
  });

  it("falls back to the default for an empty degree", () => {
    expect(maxYearsToGraduate(RULES, "")).toBe(8);
  });

  /** Groups that DISAGREE — the only kind that can detect a reordering. */
  it("takes the first matching group in the order received", () => {
    expect(maxYearsToGraduate(RULES, "Doctoral Certificate")).toBe(9);
  });

  it("trims and lowercases", () => {
    expect(maxYearsToGraduate(RULES, "  BACHELOR'S DEGREE  ")).toBe(6);
  });

  /**
   * Variants miss `post-baccalaureate`, so a string carrying NO other keyword falls to the
   * default. Asserted on "...Program" precisely because "...Certificate" does NOT — see below.
   */
  it("does not normalise spelling variants with no other matching keyword", () => {
    expect(maxYearsToGraduate(RULES, "Post baccalaureate Program")).toBe(8);
    expect(maxYearsToGraduate(RULES, "Postbaccalaureate Program")).toBe(8);
  });

  /**
   * The same variants WITH a second keyword: they miss `post-baccalaureate` and are then caught
   * by the LATER `certificate` group. The variant is unmatched; the string is not. Mirrors
   * EnrollmentYearRulesTest.maxYearsToGraduate_unhyphenatedVariantStillMatchesAnotherGroupsKeyword.
   */
  it("still matches a later keyword contained in the same degree", () => {
    expect(maxYearsToGraduate(RULES, "Post baccalaureate Certificate")).toBe(3);
    expect(maxYearsToGraduate(RULES, "Postbaccalaureate Certificate")).toBe(3);
  });
});

describe("classYearRange", () => {
  it("is anchored on the entry year, never on today", () => {
    expect(classYearRange(RULES, 2023, "Bachelor's Degree")).toEqual({ min: 2024, max: 2029 });
    // Entirely in the past, and correct — impossible under the old current-year anchoring.
    expect(classYearRange(RULES, 2016, "Bachelor's Degree")).toEqual({ min: 2017, max: 2022 });
  });

  it("uses the per-degree ceiling, so the same entry year gives a different window", () => {
    // Master's caps at +3; an unknown credential falls to the +8 default.
    expect(classYearRange(RULES, 2023, "Master's Degree")).toEqual({ min: 2024, max: 2026 });
    expect(classYearRange(RULES, 2023, undefined)).toEqual({ min: 2024, max: 2031 });
  });
});

describe("validateEntryYear", () => {
  it("refuses to pass judgement while the rules are unknown", () => {
    expect(validateEntryYear("2023", undefined)).toBe("Enrolment years are still loading.");
  });

  /**
   * The loading wording is unreachable in practice — the field is disabled while the request is in
   * flight — so the FAILED state is the only one a user reads this message in, and there it has to
   * be true and has to say what to do next.
   */
  it("blames the failure, not the load, once the rules request has failed", () => {
    expect(validateEntryYear("2023", undefined, true)).toBe(
      "We couldn't load the year rules — select Try again below.",
    );
  });

  it("requires four digits", () => {
    expect(validateEntryYear("12", RULES)).toBe("Enter a 4-digit entry year.");
    expect(validateEntryYear("", RULES)).toBe("Enter a 4-digit entry year.");
    // A `useWatch` read taken before the field mounts — same answer as an empty string.
    expect(validateEntryYear(undefined, RULES)).toBe("Enter a 4-digit entry year.");
  });

  it("tolerates surrounding whitespace on the format check", () => {
    expect(validateEntryYear("  2023  ", RULES)).toBe(true);
  });

  it("accepts both ends of the server's window", () => {
    expect(validateEntryYear("2016", RULES)).toBe(true);
    expect(validateEntryYear("2027", RULES)).toBe(true);
  });

  it("rejects either side of it, naming the window", () => {
    expect(validateEntryYear("2015", RULES)).toBe("Enter an entry year between 2016 and 2027.");
    expect(validateEntryYear("2028", RULES)).toBe("Enter an entry year between 2016 and 2027.");
  });

  /**
   * The window advances every 1 January; a year already saved against it does not. Mirrors the
   * backend, which range-checks only a value that DIFFERS from the stored one — without this a
   * guide who enrolled long enough ago is told a true fact is invalid and can save nothing at all.
   */
  describe("a value already stored on the profile", () => {
    // Aged out by construction, so revising RULES above cannot stop these cases being the case.
    const stored = RULES.entryYear.min - 2;

    it("is exempt from the window when it is unchanged", () => {
      expect(validateEntryYear(String(stored), RULES, false, stored)).toBe(true);
    });

    it("is still range-checked once it is changed", () => {
      // Both sides derived from RULES, so revising the window moves the input AND the message it
      // is expected to name — a literal here would start asserting a window nothing serves.
      expect(validateEntryYear(String(stored - 1), RULES, false, stored)).toBe(
        `Enter an entry year between ${RULES.entryYear.min} and ${RULES.entryYear.max}.`,
      );
    });

    /** The exemption covers the RANGE only — the format check runs first and still applies. */
    it("is not exempt from the 4-digit check", () => {
      expect(validateEntryYear("14", RULES, false, 14)).toBe("Enter a 4-digit entry year.");
    });
  });
});

describe("validateClassYear", () => {
  const range = { min: 2024, max: 2029 };

  it("is optional — an empty value passes even with no window", () => {
    expect(validateClassYear("", null)).toBe(true);
  });

  it("tells the user which field to fill first when the window is unknowable", () => {
    expect(validateClassYear("2027", null)).toBe("Enter your entry year first.");
  });

  /**
   * …but only when entry year is actually the missing input. With no rules the window is
   * uncomputable whatever entry year holds, so the redirect would flag a field that is filled in
   * right beside it — the exact confusion this message exists to prevent. Entry year's own
   * validator already blocks the submit and names the real cause.
   */
  it("stays silent when the window is unknowable because the rules are missing", () => {
    expect(validateClassYear("2027", null, false)).toBe(true);
  });

  it("requires four digits", () => {
    expect(validateClassYear("12", range)).toBe("Enter a 4-digit graduation year.");
  });

  it("tolerates surrounding whitespace on the format check", () => {
    expect(validateClassYear("  2027  ", range)).toBe(true);
  });

  it("accepts both ends of the derived window", () => {
    expect(validateClassYear("2024", range)).toBe(true);
    expect(validateClassYear("2029", range)).toBe(true);
  });

  it("rejects either side of it, naming the window", () => {
    expect(validateClassYear("2023", range)).toBe("Enter a graduation year between 2024 and 2029.");
    expect(validateClassYear("2030", range)).toBe("Enter a graduation year between 2024 and 2029.");
  });
});
