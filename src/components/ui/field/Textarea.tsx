"use client";

import { forwardRef, useId, useState, type ChangeEvent, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useDebounced } from "@/hooks";
import { Field } from "./Field";
import { SIZE_CLASS, type ControlExtras, type FieldSize } from "./fieldShared";
import { VisuallyHidden } from "../visually-hidden/VisuallyHidden";
import { Caption } from "../typography/Caption";

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size">, ControlExtras {
  /** @default "large" */
  size?: FieldSize;
}

/** Textarea — a labelled `<textarea>` wrapped in a {@link Field}; shows a live counter when `maxLength` is set. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
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
    maxLength,
    value,
    defaultValue,
    onChange,
    ...props
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  // Track length for the character counter — works controlled (`value`) or not (`defaultValue`).
  const controlled = value !== undefined;
  const [innerLen, setInnerLen] = useState(() => String(defaultValue ?? "").length);
  const length = controlled ? String(value ?? "").length : innerLen;
  const remaining = maxLength != null ? Math.max(0, maxLength - length) : 0;
  // Debounced so a screen reader announces the remaining count once typing settles, not per keystroke.
  const announced = useDebounced(remaining, 1500);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (!controlled) setInnerLen(event.target.value.length);
    onChange?.(event);
  };

  const showCounter = maxLength != null;

  return (
    <Field
      label={label}
      htmlFor={inputId}
      // With a counter present, the error shares the counter's row (below) instead of
      // rendering on its own line, so Field doesn't also print it.
      error={showCounter ? undefined : error}
      hint={hint}
      description={description}
      optional={optional}
      className={fieldClassName}
    >
      <textarea
        ref={ref}
        id={inputId}
        className={cn("input", SIZE_CLASS[size], className)}
        aria-invalid={error ? true : undefined}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        {...props}
      />
      {showCounter ? (
        <>
          {/* Error (if any) on the left, character counter on the right — one shared row. */}
          <div className="mt-1 flex items-baseline justify-between gap-3">
            {error ? (
              <p role="alert" className="field-error !mt-0">
                {error}
              </p>
            ) : (
              <span />
            )}
            <Caption isMonospace aria-hidden className="tabular-nums shrink-0">
              {length} / {maxLength}
            </Caption>
          </div>
          <VisuallyHidden aria-live="polite" aria-atomic>
            {announced} characters left.
          </VisuallyHidden>
        </>
      ) : null}
    </Field>
  );
});
