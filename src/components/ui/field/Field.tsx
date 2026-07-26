import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Field — label + control + (error | hint) wrapper using `.field`. Use it directly to wrap any
 * custom control (e.g. UniversityMultiSelect), or use the {@link TextField} / {@link Textarea} /
 * {@link SelectField} convenience wrappers for plain controls.
 *
 * `error` takes priority over `hint`. `description` is help rendered ABOVE the control (below the
 * label); `hint` renders BELOW it. `optional` appends an "(optional)" suffix to the label. Styles
 * live in globals.css (.field / .field-description / .field-error / .field-hint).
 */
export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  error?: ReactNode;
  hint?: ReactNode;
  /** Help text rendered above the control (below the label). For help below the control, use `hint`. */
  description?: ReactNode;
  optional?: boolean;
  className?: string;
  /** Inline styles for the wrapping `.field` (e.g. a reliable min-height reservation). */
  style?: CSSProperties;
  children: ReactNode;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  description,
  optional,
  className,
  style,
  children,
}: FieldProps) {
  return (
    <div className={cn("field", className)} style={style}>
      {label ? (
        <label id={htmlFor ? `${htmlFor}-label` : undefined} htmlFor={htmlFor}>
          {label}
          {optional ? <span className="font-normal text-ink-soft"> (optional)</span> : null}
        </label>
      ) : null}
      {description ? (
        <p id={htmlFor ? `${htmlFor}-description` : undefined} className="field-description">
          {description}
        </p>
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
