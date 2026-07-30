"use client";

import { Controller, type FieldValues, type UseFormClearErrors } from "react-hook-form";
import { Button, TextField } from "@/components/ui";
import { validateClassYear } from "./enrollmentYears";
import {
  useEnrollmentYearFields,
  type EnrollmentYearFormFields,
  type UseEnrollmentYearFieldsArgs,
} from "./useEnrollmentYearFields";

export interface EnrollmentYearFieldsProps<
  T extends FieldValues & EnrollmentYearFormFields,
> extends UseEnrollmentYearFieldsArgs<T> {
  clearErrors: UseFormClearErrors<T>;
}

/**
 * The entry-year and class-year pair, plus the failure state for the rules they depend on.
 *
 * A COMPONENT rather than a snippet each form copies: `GuideOnboardingForm` and `GuideProfileForm`
 * must behave identically here, and every one of the things below is a thing that would otherwise
 * be hand-written twice and drift on the first change to either — the required message, both
 * disabled conditions, both descriptions and their fallbacks, the blur re-validate pair, and the
 * retry copy. Centralising only the rule NUMBERS (they live on the server) or only the derived
 * values (they live in `useEnrollmentYearFields`) leaves exactly that list behind, which is the
 * defect this closes. A form renders `<EnrollmentYearFields …/>` and is done.
 *
 * Returns a FRAGMENT: the grid and the failure block are siblings, so the caller's own flex/grid
 * container spaces them, and no wrapper is imposed on either form's layout.
 */
export function EnrollmentYearFields<T extends FieldValues & EnrollmentYearFormFields>({
  control,
  getValues,
  trigger,
  clearErrors,
  storedEntryYear,
}: EnrollmentYearFieldsProps<T>) {
  const {
    yearRules,
    rulesLoading,
    rulesFetching,
    yearsUnavailable,
    refetchRules,
    validateEntry,
    entryYearIsValid,
    classRange,
    names,
  } = useEnrollmentYearFields({ control, getValues, trigger, storedEntryYear });

  return (
    <>
      {/* Entry year FIRST: class year's window is derived from it, so asking for the derived
          value before its input is what made the old rule feel arbitrary. */}
      <div className="paired-fields grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name={names.entryYear}
          rules={{
            required: "Please enter your entry year.",
            validate: (v) => validateEntry(v as string),
          }}
          render={({ field, fieldState }) => (
            <TextField
              label="Entry year"
              // The HTML attribute, not just the RHF rule: `rules.required` drives validation
              // only, so without this the input is not `required` to assistive tech. TextField
              // spreads unknown props onto the <input>, so it lands.
              required
              inputMode="numeric"
              placeholder="2023"
              // The window is visible BEFORE typing — the old form only revealed it in an error
              // after a blur.
              description={
                yearRules
                  ? `The year you started — ${yearRules.entryYear.min} to ${yearRules.entryYear.max}.`
                  : "The year you started at this university."
              }
              disabled={rulesLoading || yearsUnavailable}
              error={fieldState.error?.message}
              value={field.value as string}
              // Numeric-only: strip non-digits as you type and cap at 4 digits.
              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onFocus={() => clearErrors(names.entryYear)}
              onBlur={() => {
                field.onBlur();
                void trigger(names.entryYear);
                // The window beside this one depends on the value, so re-check it too.
                void trigger(names.classYear);
              }}
            />
          )}
        />
        <Controller
          control={control}
          name={names.classYear}
          rules={{
            validate: (v) => validateClassYear(v as string, classRange, Boolean(yearRules)),
          }}
          render={({ field, fieldState }) => (
            <TextField
              label="Class year"
              optional
              inputMode="numeric"
              placeholder="2027"
              // Gated, not merely validated: its window is UNKNOWABLE without entryYear, so
              // letting someone fill it first guarantees an error about a field they are not
              // looking at.
              disabled={rulesLoading || yearsUnavailable || !entryYearIsValid}
              // Three states, not two: with no rules the window is unknowable for a reason that
              // has nothing to do with entry year, so pointing at it would be the same wrong
              // accusation the validator no longer makes.
              description={
                classRange
                  ? `Expected graduation — ${classRange.min} to ${classRange.max}.`
                  : yearRules
                    ? "Enter your entry year first."
                    : "Available once the year rules load."
              }
              error={fieldState.error?.message}
              value={field.value as string}
              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onFocus={() => clearErrors(names.classYear)}
              onBlur={() => {
                field.onBlur();
                void trigger(names.classYear);
              }}
            />
          )}
        />
      </div>

      {/* I4 — entry year is REQUIRED, so an unknown window would otherwise dead-end the form
          entirely. Always offer the way out, and show it working: on a retry after an error the
          query is already settled, so `isLoading` stays false and NOTHING on screen would change
          for the whole round trip without `rulesFetching`. */}
      {yearsUnavailable ? (
        <div className="flex flex-wrap items-center gap-x-2">
          {/* `role="alert"` like every other error in this feature: it appears without the user
              doing anything, and it is the only thing on screen that explains why a required
              field is disabled. */}
          <p role="alert" className="field-error">
            We couldn&apos;t load the year rules.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="small"
            disabled={rulesFetching}
            onClick={() => void refetchRules()}
          >
            {rulesFetching ? "Trying…" : "Try again"}
          </Button>
        </div>
      ) : null}
    </>
  );
}
