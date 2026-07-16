import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import { useDebounced } from "@/hooks";
import { VisuallyHidden } from "../utils/VisuallyHidden";
import { Caption } from "../typography/Caption";

/** Control size. `large` (default) matches `.input`; `small` tightens padding + font. */
export type FieldSize = "small" | "large";

const SIZE_CLASS: Record<FieldSize, string | false> = {
  large: false,
  small: "px-3 py-2 text-[13px]",
};

/** Leading-icon overlay (shared by TextField + SelectField); the input reserves room with `pl-10`. */
const LEADING_ICON_CLASS =
  "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-soft [&_svg]:h-[18px] [&_svg]:w-[18px]";

/**
 * Field — label + control + (error | hint) wrapper using `.field`. Use it
 * directly to wrap any custom control (e.g. UniversityMultiSelect), or use the
 * TextField / Textarea / SelectField convenience wrappers for plain controls.
 *
 * `error` takes priority over `hint`. `optional` appends an "(optional)" suffix
 * to the label. TextField/Textarea/SelectField take `size` ("small" | "large");
 * TextField/SelectField add a `leadingIcon`, TextField also a `trailing` slot, and
 * Textarea shows a live character counter when `maxLength` is set. Styles live in
 * globals.css (.field / .field-error / .field-hint).
 */
export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  error?: ReactNode;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, optional, className, children }: FieldProps) {
  return (
    <div className={cn("field", className)}>
      {label ? (
        <label htmlFor={htmlFor}>
          {label}
          {optional ? <span className="font-normal text-ink-soft"> (optional)</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

type ControlExtras = {
  label?: ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
  optional?: boolean;
  /** Class for the wrapping Field (the control itself uses `className`). */
  fieldClassName?: string;
};

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">, ControlExtras {
  /** @default "large" */
  size?: FieldSize;
  /** Decorative icon rendered inside the input's leading edge. */
  leadingIcon?: ReactNode;
  /** Trailing content inside the input (e.g. a clear IconButton). Interactive. */
  trailing?: ReactNode;
}

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

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size">, ControlExtras {
  /** @default "large" */
  size?: FieldSize;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    error,
    hint,
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

  return (
    <Field
      label={label}
      htmlFor={inputId}
      error={error}
      hint={hint}
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
      {maxLength != null ? (
        <>
          <div className="mt-1 flex justify-end">
            <Caption isMonospace aria-hidden className="tabular-nums">
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

export interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">, ControlExtras {
  /** @default "large" */
  size?: FieldSize;
  /** Decorative icon rendered inside the select's leading edge. */
  leadingIcon?: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
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
          {...props}
        >
          {children}
        </select>
      </div>
    </Field>
  );
});
