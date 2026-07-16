import { type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Body } from "./Body";
import { Caption } from "./Caption";

/**
 * FormLabel — the label for a single form control, at one of two sizes (`large` uses body text,
 * `small` uses caption text). Pass `htmlFor` to associate it with the control. Dims when `disabled`.
 * (For grouped controls, the group's label is the {@link FormGroup} legend, not this.)
 */
export type FormLabelSize = "small" | "large";

export interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  disabled?: boolean;
  /** @default "large" */
  size?: FormLabelSize;
}

export function FormLabel({
  children,
  className,
  disabled = false,
  size = "large",
  ...rest
}: FormLabelProps) {
  const color = disabled ? "muted" : "ink";
  return (
    <label className={cn("inline-block", className)} {...rest}>
      {size === "large" ? (
        <Body as="span" size="md" weight={600} color={color}>
          {children}
        </Body>
      ) : (
        <Caption weight={700} color={color}>
          {children}
        </Caption>
      )}
    </label>
  );
}
