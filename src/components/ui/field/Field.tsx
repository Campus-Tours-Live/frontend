import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Field — label + control + (error | hint) wrapper using `.field`. Use it directly to wrap any
 * custom control (e.g. UniversityMultiSelect), or use the {@link TextField} / {@link Textarea} /
 * {@link SelectField} convenience wrappers for plain controls.
 *
 * `error` takes priority over `hint`. `optional` appends an "(optional)" suffix to the label. Styles
 * live in globals.css (.field / .field-error / .field-hint).
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
