import type { EnrollmentYearRules } from "@/lib/data-access/types";

/**
 * Longest time to graduate for a degree, applying the server's ordered rules.
 *
 * This mirrors the Java implementation exactly and must keep doing so (spec I7): trim, lowercase,
 * plain substring containment, FIRST matching group in the order received. No regex, no Unicode
 * normalisation, no sorting — the array order is the contract, and re-keying it into a map would
 * silently discard it. Spelling variants are deliberately not normalised; they fall to the default.
 */
export function maxYearsToGraduate(rules: EnrollmentYearRules, degree: string | undefined): number {
  const needle = (degree ?? "").trim().toLowerCase();
  for (const rule of rules.maxYearsToGraduate) {
    if (rule.matches.some((match) => needle.includes(match))) return rule.years;
  }
  return rules.defaultMaxYearsToGraduate;
}

/**
 * The acceptable graduation-year window for someone who enrolled in `entryYear`. The lower bound
 * is `entryYear + 1`: graduating in your enrolment year is not a real case, while one-year
 * master's programmes and transfer students are. The current year plays no part.
 */
export function classYearRange(
  rules: EnrollmentYearRules,
  entryYear: number,
  degree: string | undefined,
): { min: number; max: number } {
  return { min: entryYear + 1, max: entryYear + maxYearsToGraduate(rules, degree) };
}

/**
 * The two field validators, extracted so BOTH forms call the same function rather than each
 * carrying its own copy. Everything a future change would touch — the messages, the 4-digit
 * check, the loading wording, the "enter your entry year first" gate — lives here once.
 *
 * Returning `true | string` matches react-hook-form's `validate` contract, so a form wires them
 * straight in with no adapter.
 *
 * Fails CLOSED while `rules` is undefined: entry year is required, and passing it against a window
 * nobody knows would let a value through that the server will then reject.
 *
 * `value` is optional so the same function can judge a react-hook-form `validate` argument (always
 * a string) AND a `useWatch` read taken before the field has mounted (possibly undefined) — one
 * function, so the gate that enables class year cannot disagree with the rule that blocks submit.
 */
export function validateEntryYear(
  value: string | undefined,
  rules: EnrollmentYearRules | undefined,
): true | string {
  if (!rules) return "Enrolment years are still loading.";
  if (!/^\d{4}$/.test((value ?? "").trim())) return "Enter a 4-digit entry year.";
  const year = Number(value);
  const { min, max } = rules.entryYear;
  return (year >= min && year <= max) || `Enter an entry year between ${min} and ${max}.`;
}

/**
 * Class year is OPTIONAL, so an empty value always passes. A non-empty one needs a window, and the
 * window is unknowable until entry year is valid — hence the explicit redirect rather than a
 * range message the user cannot act on.
 */
export function validateClassYear(
  value: string,
  range: { min: number; max: number } | null,
): true | string {
  if (!value) return true;
  if (!range) return "Enter your entry year first.";
  if (!/^\d{4}$/.test(value.trim())) return "Enter a 4-digit graduation year.";
  const year = Number(value);
  return (
    (year >= range.min && year <= range.max) ||
    `Enter a graduation year between ${range.min} and ${range.max}.`
  );
}
