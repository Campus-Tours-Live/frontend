import { type HTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "../utils/VisuallyHidden";
import { ALERT_COLOR, ALERT_ICON, ALERT_ICON_SIZE, type AlertVariant } from "./alertShared";

/**
 * Banner — a prominent, full-width, dismissible message about a significant, broadly-affecting
 * event (an incident, an outage, a site-wide notice). Like {@link Alert} but spans its container and
 * always carries a close button. Shares Alert's variant/icon/colour tokens. role="alert".
 *
 *   <Banner variant="warning" onClose={dismiss}>Scheduled maintenance tonight 10–11pm ET.</Banner>
 */
export type BannerVariant = AlertVariant;

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
  const Icon = ALERT_ICON[variant];
  return (
    <div
      role="alert"
      className={cn(
        "flex w-full items-start gap-3 border px-4 py-3 text-[13px]",
        ALERT_COLOR[variant],
        className,
      )}
      {...rest}
    >
      <span className="mt-px shrink-0">
        <VisuallyHidden>{`${a11yIconLabel ?? variant}:`}</VisuallyHidden>
        <Icon size={ALERT_ICON_SIZE} strokeWidth={2} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">{children}</div>

      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="-mr-1 -mt-0.5 shrink-0 rounded-full p-1 text-current opacity-70 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-current"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
