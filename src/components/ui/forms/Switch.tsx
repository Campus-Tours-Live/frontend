import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Switch — iOS-style on/off control for a single setting. Controlled: pass
 * `checked` + `onChange(next)`; it never tracks its own state. Renders a native
 * <button role="switch" aria-checked> so Space/Enter flip it for free and screen
 * readers announce on/off.
 *
 * An accessible name is required and enforced at compile time — pass exactly one
 * of `label` (becomes aria-label), `aria-label`, or `aria-labelledby`. Any visible
 * on/off text ("Available"/"Unavailable") stays the caller's responsibility, rendered
 * alongside the switch (not inside), so this component stays generic. Styles: globals.css.
 *
 *   <Switch checked={on} onChange={setOn} label="Notifications" />
 */
type SwitchBaseProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "checked" | "onChange" | "aria-label" | "aria-labelledby"
> & {
  checked: boolean;
  onChange: (next: boolean) => void;
};

type SwitchWithLabel = SwitchBaseProps & {
  /** Convenience accessible name — sets `aria-label`. */
  label: string;
  "aria-label"?: never;
  "aria-labelledby"?: never;
};
type SwitchWithAriaLabel = SwitchBaseProps & {
  "aria-label": string;
  label?: never;
  "aria-labelledby"?: never;
};
type SwitchWithLabelledBy = SwitchBaseProps & {
  "aria-labelledby": string;
  label?: never;
  "aria-label"?: never;
};

/** Exactly one accessible name (label | aria-label | aria-labelledby) is required. */
export type SwitchProps = SwitchWithLabel | SwitchWithAriaLabel | SwitchWithLabelledBy;

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    checked,
    onChange,
    disabled,
    label,
    className,
    type,
    onClick,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? label)}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled}
      onClick={(event) => {
        // A disabled <button> never dispatches click events (DOM spec), so this only
        // ever runs when the switch is enabled — no extra `disabled` guard needed.
        onClick?.(event);
        onChange(!checked);
      }}
      className={cn("switch", checked && "switch-checked", className)}
      {...props}
    >
      <span className="switch-knob" aria-hidden="true" />
    </button>
  );
});
