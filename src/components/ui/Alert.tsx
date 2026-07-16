import { type HTMLAttributes, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "./VisuallyHidden";

/**
 * Alert — a block-level message / notice (`.alert`). Use for form-submit errors,
 * inline notices, etc. Each variant renders a matching leading icon plus a
 * screen-reader-only severity label (so the icon's meaning isn't lost). `role`
 * defaults to "alert" (assertive); pass role="status" for passive notes. An
 * optional `action` (e.g. a Button/Link) renders under the message. Styles: globals.css.
 */
export type AlertVariant = "info" | "warning" | "success" | "error";

const ALERT: Record<AlertVariant, string> = {
  info: "alert-info",
  warning: "alert-warning",
  success: "alert-success",
  error: "alert-error",
};

const ICON: Record<AlertVariant, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  success: CircleCheck,
  error: CircleAlert,
};

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
  const Icon = ICON[variant];
  return (
    <div
      role={role}
      className={cn("alert flex items-start gap-2.5", ALERT[variant], className)}
      {...props}
    >
      <span className="mt-px shrink-0">
        <VisuallyHidden>{`${a11yIconLabel ?? variant}:`}</VisuallyHidden>
        <Icon size={16} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {children}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}
