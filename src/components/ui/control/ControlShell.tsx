import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ControlShell — the shared chrome for a checkbox/radio-style control: the clickable `<label>`
 * wrapper (`.control-label`, pointer cursor + disabled dimming) and the optional text label beside
 * the control. {@link Checkbox} and {@link Radio} differ only in their input type + indicator box, so
 * they render those two as `children` (a `peer sr-only` input followed by its indicator) and share
 * everything else here.
 */
export interface ControlShellProps {
  /** The control itself — a `peer sr-only` input followed by its `aria-hidden` indicator box. */
  children: ReactNode;
  /** Text label rendered beside the control. Omit when the name comes from `aria-label(ledby)`. */
  label?: ReactNode;
  /** @default false */
  disabled?: boolean;
  /** Merged onto the wrapping `<label>`. */
  className?: string;
}

export function ControlShell({ children, label, disabled = false, className }: ControlShellProps) {
  return (
    <label
      className={cn(
        "control-label",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
    >
      {children}
      {label ? <span className="leading-[18px]">{label}</span> : null}
    </label>
  );
}
