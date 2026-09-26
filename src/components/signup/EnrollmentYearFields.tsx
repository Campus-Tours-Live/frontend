"use client";

/** Shared entry-year and class-year fields with server-backed validation rules. */

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
              required
              inputMode="numeric"
              placeholder="2023"
              description={
                yearRules
                  ? `The year you started — ${yearRules.entryYear.min} to ${yearRules.entryYear.max}.`
                  : "The year you started at this university."
              }
              disabled={rulesLoading || yearsUnavailable}
              error={fieldState.error?.message}
              value={field.value as string}
              onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onFocus={() => clearErrors(names.entryYear)}
              onBlur={() => {
                field.onBlur();
                void trigger(names.entryYear);
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
              disabled={rulesLoading || yearsUnavailable || !entryYearIsValid}
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

      
      {yearsUnavailable ? (
        <div className="flex flex-wrap items-center gap-x-2">
          
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
