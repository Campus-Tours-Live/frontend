"use client";

import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";
import { TextField } from "@/components/ui";
import {
  formatIsoDateToUs,
  parseUsDateToIso,
  US_DATE_PLACEHOLDER,
} from "@/lib/availability/formatDate";

interface UsDateFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  error?: string;
  optional?: boolean;
  requiredMessage?: string;
}

function toDisplayValue(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return formatIsoDateToUs(raw);
  return raw;
}

/**
 * Date text input shown as mm/dd/yyyy; stores yyyy-mm-dd in react-hook-form after blur/submit.
 */
export function UsDateField<T extends FieldValues>({
  control,
  name,
  label,
  error,
  optional,
  requiredMessage = "This field is required",
}: UsDateFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      rules={{
        validate: (value) => {
          const raw = String(value ?? "").trim();
          if (!raw) return optional ? true : requiredMessage;
          return parseUsDateToIso(raw) !== null || `Use ${US_DATE_PLACEHOLDER} format`;
        },
      }}
      render={({ field }) => (
        <TextField
          label={label}
          optional={optional}
          error={error}
          placeholder={US_DATE_PLACEHOLDER}
          inputMode="numeric"
          autoComplete="off"
          value={toDisplayValue(field.value)}
          onChange={(event) => {
            field.onChange(event.target.value);
          }}
          onBlur={() => {
            const raw = String(field.value ?? "").trim();
            if (raw) {
              const iso = parseUsDateToIso(raw);
              if (iso) field.onChange(iso);
            }
            field.onBlur();
          }}
          name={field.name}
        />
      )}
    />
  );
}
