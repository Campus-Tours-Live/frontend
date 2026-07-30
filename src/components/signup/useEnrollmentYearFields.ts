"use client";

import { useEffect } from "react";
import {
  useWatch,
  type Control,
  type FieldPath,
  type FieldValues,
  type UseFormGetValues,
  type UseFormTrigger,
} from "react-hook-form";
import { useEnrollmentYears } from "@/lib/data-access";
import { classYearRange, validateEntryYear } from "./enrollmentYears";

/** The three fields any form using this hook must carry. */
export interface EnrollmentYearFormFields {
  entryYear: string;
  classYear: string;
  degree: string;
}

/** The slice of `useForm`'s return both the hook and {@link EnrollmentYearFields} need. */
export interface UseEnrollmentYearFieldsArgs<T extends FieldValues & EnrollmentYearFormFields> {
  control: Control<T>;
  getValues: UseFormGetValues<T>;
  trigger: UseFormTrigger<T>;
}

/**
 * Everything both year fields need, derived once. Extracted because `GuideOnboardingForm` and
 * `GuideProfileForm` must behave identically here — and a second hand-written copy would drift on
 * the FIRST behavioural change to either (a new disabled condition, different retry copy, a
 * re-validate trigger someone remembers in one place only). The rule numbers already live on the
 * server; this is the same argument applied to the logic around them.
 *
 * Generic over the form shape so both callers pass their own `control` without casting; both have
 * `entryYear`, `classYear` and `degree` string fields.
 */
export function useEnrollmentYearFields<T extends FieldValues & EnrollmentYearFormFields>(
  args: UseEnrollmentYearFieldsArgs<T>,
) {
  const { control, getValues, trigger } = args;
  // The field names are literals on `EnrollmentYearFormFields`, but TypeScript can't see through
  // the generic to say so — hence the one cast per name, kept here rather than at each call site.
  const entryYearName = "entryYear" as FieldPath<T>;
  const degreeName = "degree" as FieldPath<T>;
  const classYearName = "classYear" as FieldPath<T>;

  const {
    data: yearRules,
    isLoading: rulesLoading,
    // `isLoading` is `isPending && isFetching` — FIRST load only. A retry runs against a query that
    // already settled into `error`, so isLoading stays false and `yearsUnavailable` stays true:
    // without isFetching the retry button gives no feedback at all for the whole round trip.
    isFetching: rulesFetching,
    isError: rulesErrored,
    refetch: refetchRules,
  } = useEnrollmentYears();

  // SUBSCRIBED, not read. `degree` is an input to classYear's ceiling (R2), so reading it with
  // getValues() would compute the window once and never recompute when the user switches degree:
  // the description would keep showing the bachelor's range under a master's, and an
  // already-typed classYear would keep passing against a window that no longer applies. useWatch
  // subscribes to just these two fields rather than re-rendering on every keystroke anywhere.
  const entryYearRaw = useWatch({ control, name: entryYearName }) as string | undefined;
  const degreeValue = useWatch({ control, name: degreeName }) as string | undefined;

  const yearsUnavailable = !rulesLoading && (rulesErrored || !yearRules);

  // The gate reuses the FIELD VALIDATOR rather than re-deriving the bounds check, so "valid enough
  // to unlock class year" and "valid enough to submit" can never disagree.
  const entryYearIsValid = validateEntryYear(entryYearRaw, yearRules) === true;
  const classRange =
    yearRules && entryYearIsValid
      ? classYearRange(yearRules, Number(entryYearRaw), degreeValue)
      : null;

  // Recomputing the window is not enough: a classYear typed under the old window is still sitting
  // in the form, still passing. Re-run its validation whenever either input to the rule moves —
  // including a background refetch that changes `yearRules` itself.
  useEffect(() => {
    if (getValues(classYearName)) void trigger(classYearName);
  }, [entryYearRaw, degreeValue, yearRules, classYearName, trigger, getValues]);

  return {
    yearRules,
    rulesLoading,
    rulesFetching,
    yearsUnavailable,
    refetchRules,
    entryYearIsValid,
    classRange,
    // Handed back so `EnrollmentYearFields` can name its Controllers without repeating the casts.
    names: { entryYear: entryYearName, classYear: classYearName },
  };
}
