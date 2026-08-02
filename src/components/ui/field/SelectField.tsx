"use client";

import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Field } from "./Field";
import { LEADING_ICON_CLASS, SIZE_CLASS, type ControlExtras, type FieldSize } from "./fieldShared";

export interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">, ControlExtras {
  /** @default "large" */
  size?: FieldSize;
  /** Decorative icon rendered inside the select's leading edge. */
  leadingIcon?: ReactNode;
}

/**
 * SelectField — a labelled native `<select>` wrapped in a {@link Field} (relies on the browser's
 * native arrow). For the Living Design styled select with a themed caret, see {@link Select}.
 */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  {
    label,
    error,
    hint,
    description,
    optional,
    id,
    className,
    fieldClassName,
    size = "large",
    leadingIcon,
    children,
    ...props
  },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <Field
      label={label}
      htmlFor={selectId}
      error={error}
      hint={hint}
      // `description` is part of ControlExtras and was landing on the <select> as an unknown
      // attribute instead of on the Field — so nothing rendered for aria-describedby to point at.
      description={description}
      optional={optional}
      className={fieldClassName}
    >
      <div className="relative">
        {leadingIcon ? (
          <span aria-hidden className={LEADING_ICON_CLASS}>
            {leadingIcon}
          </span>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          className={cn("input", SIZE_CLASS[size], leadingIcon && "pl-10", className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={description ? `${selectId}-description` : undefined}
          {...props}
        >
          {children}
        </select>
      </div>
    </Field>
  );
});
