"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Field } from "./Field";
import { LEADING_ICON_CLASS, SIZE_CLASS, type ControlExtras, type FieldSize } from "./fieldShared";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">, ControlExtras {
  /** @default "large" */
  size?: FieldSize;
  /** Decorative icon rendered inside the input's leading edge. */
  leadingIcon?: ReactNode;
  /** Trailing content inside the input (e.g. a clear IconButton). Interactive. */
  trailing?: ReactNode;
}

/** TextField — a labelled `<input>` wrapped in a {@link Field}, with optional leading icon + trailing slot. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    error,
    hint,
    optional,
    id,
    className,
    fieldClassName,
    size = "large",
    leadingIcon,
    trailing,
    ...props
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field
      label={label}
      htmlFor={inputId}
      error={error}
      hint={hint}
      optional={optional}
      className={fieldClassName}
    >
      <div className="relative">
        {leadingIcon ? (
          <span aria-hidden className={LEADING_ICON_CLASS}>
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "input",
            SIZE_CLASS[size],
            leadingIcon && "pl-10",
            trailing && "pr-10",
            className,
          )}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-0 flex items-center pr-2">{trailing}</span>
        ) : null}
      </div>
    </Field>
  );
});
