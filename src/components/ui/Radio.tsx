import { forwardRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Radio — one option in a mutually-exclusive group. Controlled: pass `checked` + `onChange`, and the
 * same `name` to every radio in the group (required for keyboard navigation). An accessible name is
 * required at compile time — exactly one of `label` or `aria-labelledby`. `className` styles the
 * wrapping <label>; remaining props (`value`, `id`, …) flow to the input.
 *
 *   <Radio name="plan" value="mo" label="Monthly" checked={p === "mo"} onChange={(e) => setP(e.target.value)} />
 */
type RadioBaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange" | "aria-labelledby"
> & {
  name: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

type RadioLabelProps = RadioBaseProps & { label: ReactNode; "aria-labelledby"?: never };
type RadioA11yProps = RadioBaseProps & { "aria-labelledby": string; label?: never };

export type RadioProps = RadioLabelProps | RadioA11yProps;

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(props, ref) {
  const {
    label,
    "aria-labelledby": ariaLabelledBy,
    checked = false,
    disabled = false,
    className,
    name,
    onChange,
    ...inputRest
  } = props as RadioBaseProps & { label?: ReactNode; "aria-labelledby"?: string };

  return (
    <label
      className={cn(
        "inline-flex items-start gap-2 text-[14px] text-ink",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
    >
      <input
        ref={ref}
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-labelledby={ariaLabelledBy}
        className="peer sr-only"
        {...inputRest}
      />
      <span
        aria-hidden
        className={cn(
          "mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] bg-white transition-colors",
          "peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-soft",
          checked && !disabled ? "border-primary" : "border-border",
          disabled && "bg-canvas",
        )}
      >
        {checked ? (
          <span className={cn("h-2.5 w-2.5 rounded-full", disabled ? "bg-border" : "bg-primary")} />
        ) : null}
      </span>
      {label ? <span className="leading-[18px]">{label}</span> : null}
    </label>
  );
});
