import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Toggle — reusable iOS-style switch (`.switch`). Controlled: pass `checked` +
 * `onChange(next)`; the component never tracks its own state. Renders a
 * native <button role="switch" aria-checked> so Space/Enter toggle it for
 * free (native button behaviour) and screen readers announce on/off.
 *
 * Accessible name: pass `label` (used as `aria-label`) or your own
 * `aria-label`/`aria-labelledby` — one of the three is required for a11y.
 * Any visible on/off text (e.g. "Available"/"Unavailable") is the caller's
 * responsibility and should be rendered alongside the switch, not inside it,
 * so this component stays generic. Styles live in globals.css.
 */
export interface ToggleProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "checked" | "onChange"
> {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Convenience accessible name — sets `aria-label` when no explicit aria-label/aria-labelledby is passed. */
  label?: string;
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
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
        // ever runs when the toggle is enabled — no extra `disabled` guard needed.
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
