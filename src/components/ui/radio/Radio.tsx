import { forwardRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ControlShell } from "../control/ControlShell";

/**
 * Radio — one option in a mutually-exclusive group. Controlled: pass `checked` + `onChange`, and the
 * same `name` to every radio in the group (required for keyboard navigation). An accessible name is
 * required at compile time — exactly one of `label`, `aria-label`, or `aria-labelledby`. `className`
 * styles the wrapping <label>; remaining props (`value`, `id`, …) flow to the input.
 *
 *   <Radio name="plan" value="mo" label="Monthly" checked={p === "mo"} onChange={(e) => setP(e.target.value)} />
 */
type RadioBaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange" | "aria-label" | "aria-labelledby"
> & {
  name: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

type RadioLabelProps = RadioBaseProps & {
  label: ReactNode;
  "aria-label"?: never;
  "aria-labelledby"?: never;
};
type RadioAriaLabelProps = RadioBaseProps & {
  "aria-label": string;
  label?: never;
  "aria-labelledby"?: never;
};
type RadioLabelledByProps = RadioBaseProps & {
  "aria-labelledby": string;
  label?: never;
  "aria-label"?: never;
};

export type RadioProps = RadioLabelProps | RadioAriaLabelProps | RadioLabelledByProps;

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(props, ref) {
  const {
    label,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    checked = false,
    disabled = false,
    className,
    name,
    onChange,
    ...inputRest
  } = props as RadioBaseProps & {
    label?: ReactNode;
    "aria-label"?: string;
    "aria-labelledby"?: string;
  };

  return (
    <ControlShell label={label} disabled={disabled} className={className}>
      <input
        ref={ref}
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className="peer sr-only"
        {...inputRest}
      />
      <span
        aria-hidden
        className={cn(
          "control-box rounded-full",
          checked && !disabled ? "border-primary" : "border-border",
          disabled && "bg-canvas",
        )}
      >
        {checked ? (
          <span className={cn("h-2.5 w-2.5 rounded-full", disabled ? "bg-border" : "bg-primary")} />
        ) : null}
      </span>
    </ControlShell>
  );
});
