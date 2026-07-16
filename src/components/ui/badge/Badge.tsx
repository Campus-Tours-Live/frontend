import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Badge — small pill label (`.badge`). For the dotted "status" pill use
 * StatusBadge. Styles live in globals.css.
 */
export type BadgeVariant =
  | "primary"
  | "sage"
  | "coral"
  | "success"
  | "warn"
  | "verified"
  | "neutral";

const BADGE: Record<BadgeVariant, string> = {
  primary: "badge-primary",
  sage: "badge-sage",
  coral: "badge-coral",
  success: "badge-success",
  warn: "badge-warn",
  verified: "badge-verified",
  neutral: "badge-neutral",
};

export function Badge({
  variant = "primary",
  className,
  ...props
}: { variant?: BadgeVariant } & HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("badge", BADGE[variant], className)} {...props} />;
}

/** StatusBadge — pill with a leading dot (`.status`). */
export type StatusVariant = "info" | "warning" | "success" | "error";

const STATUS: Record<StatusVariant, string> = {
  info: "status-info",
  warning: "status-warning",
  success: "status-success",
  error: "status-error",
};

export function StatusBadge({
  variant = "info",
  className,
  ...props
}: { variant?: StatusVariant } & HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("status", STATUS[variant], className)} {...props} />;
}
