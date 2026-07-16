"use client";

import { useId, type ReactNode } from "react";
import { Field } from "@/components/ui";
import { UniversityMultiSelect, type UniversityOption } from "./UniversityMultiSelect";

export type { UniversityOption };

export interface UniversityFieldProps {
  label: ReactNode;
  value: UniversityOption[];
  onChange: (next: UniversityOption[]) => void;
  /** Help text shown above the control (via Field's `description`). */
  description?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  max?: number;
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
}: UniversityFieldProps) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} description={description} error={error} optional={optional}>
      <UniversityMultiSelect
        id={id}
        aria-labelledby={`${id}-label`}
        value={value}
        onChange={onChange}
        max={max}
      />
    </Field>
  );
}
