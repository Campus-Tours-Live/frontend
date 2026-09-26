"use client";

/** Accessible Field wrapper around UniversityMultiSelect. */

import { useId, type CSSProperties, type ReactNode } from "react";
import { Field } from "@/components/ui";
import { UniversityMultiSelect, type UniversityOption } from "./UniversityMultiSelect";

export type { UniversityOption };

export interface UniversityFieldProps {
  
  label: string;
  value: UniversityOption[];
  onChange: (next: UniversityOption[]) => void;
  
  description?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  
  className?: string;
  
  style?: CSSProperties;
  max?: number;
  
  source?: "catalog" | "live";
  
  onFocus?: () => void;
}

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
