import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";

/**
 * Shared severity vocabulary for {@link Alert} and {@link Banner} — one source for the variant type,
 * the leading icon, the themed colour class, and the icon size, so the two never drift.
 */
export type AlertVariant = "info" | "warning" | "success" | "error";

/** Themed colour classes (defined in globals.css: .alert-info / -warning / -success / -error). */
export const ALERT_COLOR: Record<AlertVariant, string> = {
  info: "alert-info",
  warning: "alert-warning",
  success: "alert-success",
  error: "alert-error",
};

export const ALERT_ICON: Record<AlertVariant, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  success: CircleCheck,
  error: CircleAlert,
};

/** Leading severity-icon size, shared so Alert (inline) and Banner (full-width) match. */
export const ALERT_ICON_SIZE = 16;
