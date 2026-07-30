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
 * `rulesUnavailable` says WHICH kind of "no rules" that is — it is the same flag that puts the
 * "Try again" button on screen, so the failed message can point at it. Without the distinction the
 * loading wording is the only one a user ever actually reads (loading disables the field, so the
 * form is not realistically submittable then) and it is untrue in the state it appears in.
 *
 * `value` is optional so the same function can judge a react-hook-form `validate` argument (always
 * a string) AND a `useWatch` read taken before the field has mounted (possibly undefined) — one
 * function, so the gate that enables class year cannot disagree with the rule that blocks submit.
 *
 * `storedEntryYear` is the year the SERVER returned for this profile, and a value EQUAL to it is
 * exempt from the RANGE check — the same rule the backend applies, which range-checks only a value
 * that differs from the stored one. The window advances every 1 January and a stored year does not,
 * so a guide who enrolled 11+ years ago is otherwise told a true fact is invalid, has class year
 * greyed out beside it, and cannot save an edit to any other field. A CHANGED value is still
 * checked, so nobody can newly set an aged-out year; onboarding has no stored value, passes none,
 * and stays fully checked.
 */
export function validateEntryYear(
  value: string | undefined,
  rules: EnrollmentYearRules | undefined,
  rulesUnavailable = false,
  storedEntryYear?: number,
): true | string {
  if (!rules) {
    return rulesUnavailable
      ? "We couldn't load the year rules — select Try again below."
      : "Enrolment years are still loading.";
  }
  if (!/^\d{4}$/.test((value ?? "").trim())) return "Enter a 4-digit entry year.";
  const year = Number(value);
  // Unchanged from what the server returned → exempt from the window (see above). Deliberately
  // AFTER the format check: a stored value is never a way to get a non-year past the form.
  if (year === storedEntryYear) return true;
  const { min, max } = rules.entryYear;
  return (year >= min && year <= max) || `Enter an entry year between ${min} and ${max}.`;
}

/**
 * Class year is OPTIONAL, so an empty value always passes. A non-empty one needs a window, and the
 * window is unknowable until entry year is valid — hence the explicit redirect rather than a
 * range message the user cannot act on.
 *
 * A null `range` has TWO causes and only one of them is the user's to fix, which is what
 * `rulesKnown` separates. Without the rules nobody can compute the window, so the redirect would
 * accuse a field that — on a form seeded from a saved profile — is filled in right beside it.
 * Entry year's own validator already blocks the submit and names the real cause there.
 */
export function validateClassYear(
  value: string,
  range: { min: number; max: number } | null,
  rulesKnown = true,
): true | string {
  if (!value) return true;
  if (!rulesKnown) return true;
  if (!range) return "Enter your entry year first.";
  if (!/^\d{4}$/.test(value.trim())) return "Enter a 4-digit graduation year.";
  const year = Number(value);
  return (
    (year >= range.min && year <= range.max) ||
    `Enter a graduation year between ${range.min} and ${range.max}.`
  );
}
