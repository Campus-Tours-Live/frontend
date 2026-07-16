import { type HTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "./VisuallyHidden";

/**
 * Banner — a prominent, full-width, dismissible message about a significant, broadly-affecting
 * event (an incident, an outage, a site-wide notice). Like {@link Alert} but spans its container and
 * always carries a close button. Reuses the alert variant colours. role="alert".
 *
 *   <Banner variant="warning" onClose={dismiss}>Scheduled maintenance tonight 10–11pm ET.</Banner>
 */
export type BannerVariant = "info" | "warning" | "success" | "error";

const COLOR: Record<BannerVariant, string> = {
  info: "alert-info",
  warning: "alert-warning",
  success: "alert-success",
  error: "alert-error",
};

const ICON: Record<BannerVariant, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  success: CircleCheck,
  error: CircleAlert,
};

export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  variant?: BannerVariant;
  children: ReactNode;
  onClose: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Screen-reader severity label read before the message. Default: the variant name. */
  a11yIconLabel?: string;
  /** Accessible label for the close button. @default "Dismiss" */
  closeLabel?: string;
}

export function Banner({
  variant = "info",
  children,
  onClose,
  a11yIconLabel,
  closeLabel = "Dismiss",
  className,
  ...rest
}: BannerProps) {
  const Icon = ICON[variant];
  return (
    <div
      role="alert"
      className={cn(
        "flex w-full items-start gap-3 border px-4 py-3 text-[13px]",
        COLOR[variant],
        className,
      )}
      {...rest}
    >
      <span className="mt-px shrink-0">
        <VisuallyHidden>{`${a11yIconLabel ?? variant}:`}</VisuallyHidden>
        <Icon size={18} strokeWidth={2} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">{children}</div>

      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="-mr-1 -mt-0.5 shrink-0 rounded-full p-1 text-current opacity-70 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
