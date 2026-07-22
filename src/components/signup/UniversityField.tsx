"use client";

import { useId, type ReactNode } from "react";
import { Field } from "@/components/ui";
import { UniversityMultiSelect, type UniversityOption } from "./UniversityMultiSelect";

export type { UniversityOption };

export interface UniversityFieldProps {
  /** Required, non-empty: it both labels the Field and names the control's `role="group"` (via
   *  aria-labelledby), so a falsy label would leave the group nameless. Typed `string`, not
   *  ReactNode, to keep it a real accessible name. */
  label: string;
  value: UniversityOption[];
  onChange: (next: UniversityOption[]) => void;
  /** Help text shown above the control (via Field's `description`). */
  description?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  max?: number;
  /** "catalog" = local table (default); "live" = every U.S. school via the Scorecard proxy. */
  source?: "catalog" | "live";
}

/**
 * UniversityField — {@link UniversityMultiSelect} wrapped in a {@link Field}, wiring the label to the
 * control from ONE generated id so callers never hand-coordinate an htmlFor/id pair. The Field label
 * both associates with the search input (htmlFor→id: click-to-focus, while below `max`) AND names the
 * always-present `role="group"` container via aria-labelledby — so the field keeps an accessible name
 * even at `max`, when the search input has unmounted.
 */
export function UniversityField({
  label,
  value,
  onChange,
  description,
  error,
  optional,
  max,
  source,
}: UniversityFieldProps) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} description={description} error={error} optional={optional}>
      <UniversityMultiSelect
        id={id}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        aria-invalid={error ? true : undefined}
        value={value}
        onChange={onChange}
        max={max}
        source={source}
      />
    </Field>
  );
}
