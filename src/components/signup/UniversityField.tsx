"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
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
  /** Extra classes for the wrapping `.field`. */
  className?: string;
  /** Inline styles for the wrapping `.field` — e.g. a min-height so the field reserves a constant
   *  footprint and the card doesn't jump as selections are added/removed (inline so it never depends
   *  on Tailwind emitting a fresh arbitrary class). */
  style?: CSSProperties;
  max?: number;
  /** "catalog" = local table (default); "live" = every U.S. school via the Scorecard proxy. */
  source?: "catalog" | "live";
  /** Called when the control's search input gains focus (e.g. to clear a "required" error). */
  onFocus?: () => void;
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
  className,
  style,
  max,
  source,
  onFocus,
}: UniversityFieldProps) {
  const id = useId();
  return (
    <Field
      label={label}
      htmlFor={id}
      description={description}
      error={error}
      optional={optional}
      className={className}
      style={style}
    >
      <UniversityMultiSelect
        id={id}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        aria-invalid={error ? true : undefined}
        value={value}
        onChange={onChange}
        max={max}
        source={source}
        onFocus={onFocus}
      />
    </Field>
  );
}
