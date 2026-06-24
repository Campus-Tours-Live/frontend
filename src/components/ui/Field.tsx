import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Field — label + control + (error | hint) wrapper using `.field`. Use it
 * directly to wrap any custom control (e.g. UniversityMultiSelect), or use the
 * TextField / Textarea / SelectField convenience wrappers for plain controls.
 *
 * `error` takes priority over `hint`. `optional` appends an "(optional)" suffix
 * to the label. Styles live in globals.css (.field / .field-error / .field-hint).
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

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement>, ControlExtras {}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, optional, id, className, fieldClassName, ...props },
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
      <input
        ref={ref}
        id={inputId}
        className={cn("input", className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </Field>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, ControlExtras {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, optional, id, className, fieldClassName, ...props },
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
      <textarea
        ref={ref}
        id={inputId}
        className={cn("input", className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </Field>
  );
});

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement>, ControlExtras {}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, optional, id, className, fieldClassName, children, ...props },
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
      <select
        ref={ref}
        id={selectId}
        className={cn("input", className)}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
});
