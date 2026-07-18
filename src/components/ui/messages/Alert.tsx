import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "../visually-hidden/VisuallyHidden";
import { ALERT_COLOR, ALERT_ICON, ALERT_ICON_SIZE, type AlertVariant } from "./alertShared";

/**
 * Alert — a block-level message / notice (`.alert`). Use for form-submit errors,
 * inline notices, etc. Each variant renders a matching leading icon plus a
 * screen-reader-only severity label (so the icon's meaning isn't lost). `role`
 * defaults to "alert" (assertive); pass role="status" for passive notes. An
 * optional `action` (e.g. a Button/Link) renders under the message. Styles: globals.css.
 */
export type { AlertVariant };

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  /** Screen-reader severity label read before the message. Default: the variant name. */
  a11yIconLabel?: string;
  /** Optional action rendered under the message (e.g. a Button or Link). */
  action?: ReactNode;
}

export function Alert({
  variant = "info",
  role = "alert",
  a11yIconLabel,
  action,
  className,
  children,
  ...props
}: AlertProps) {
  const Icon = ALERT_ICON[variant];
  return (
    <div
      role={role}
      className={cn("alert flex items-start gap-2.5", ALERT_COLOR[variant], className)}
      {...props}
    >
      <span className="mt-px shrink-0">
        <VisuallyHidden>{`${a11yIconLabel ?? variant}:`}</VisuallyHidden>
        <Icon size={ALERT_ICON_SIZE} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {children}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}
