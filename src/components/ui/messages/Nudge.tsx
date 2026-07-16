import { type HTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Body } from "../typography/Body";
import { Icon } from "../icon/Icon";
import { IconButton } from "../icon-button/IconButton";

/**
 * Nudge — an inline, optional reminder or next-step hint (not required to complete a task). Shows a
 * prominent `title`, optional `leading` icon, optional body (`children`) and `actions`, and — when
 * `onClose` is given — a dismiss button.
 *
 *   <Nudge
 *     leading={<Icon name="info" />}
 *     title="Finish setup"
 *     actions={<ButtonRow align="start"><Button size="small">Add hours</Button></ButtonRow>}
 *     onClose={() => setDismissed(true)}
 *   >
 *     Add weekly hours so participants can book you.
 *   </Nudge>
 */
/** Tone — pick by trigger context. `neutral` is the plain card look; the rest tint the surface
 *  (and the leading icon) with the matching theme token. */
export type NudgeVariant = "neutral" | "info" | "success" | "warning" | "error";

const SURFACE: Record<NudgeVariant, string> = {
  neutral: "border-border bg-card",
  info: "border-primary-soft bg-primary-soft",
  success: "border-success-soft bg-success-soft",
  warning: "border-warning-soft bg-warning-soft",
  error: "border-error-soft bg-error-soft",
};

const LEADING_COLOR: Record<NudgeVariant, string> = {
  neutral: "text-ink-soft",
  info: "text-primary",
  success: "text-success-foreground",
  warning: "text-warning-foreground",
  error: "text-error-foreground",
};

export interface NudgeProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Prominent title line. */
  title: ReactNode;
  /** @default "neutral" */
  variant?: NudgeVariant;
  /** Optional body copy. */
  children?: ReactNode;
  /** Optional leading content (usually an icon). */
  leading?: ReactNode;
  /** Optional actions (e.g. a ButtonRow). */
  actions?: ReactNode;
  /** When provided, renders a dismiss button that fires this on click. */
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Accessible label for the dismiss button. Default "Dismiss". */
  closeLabel?: string;
}

export function Nudge({
  title,
  children,
  leading,
  actions,
  onClose,
  closeLabel = "Dismiss",
  variant = "neutral",
  className,
  ...rest
}: NudgeProps) {
  return (
    <div
      className={cn("flex items-start gap-3 rounded-card border p-4", SURFACE[variant], className)}
      {...rest}
    >
      {leading != null ? (
        <div className={cn("flex shrink-0 items-center", LEADING_COLOR[variant])}>{leading}</div>
      ) : null}

      <div className="min-w-0 flex-1">
        <Body as="div" weight={600}>
          {title}
        </Body>
        {children != null ? (
          <Body as="div" size="small" color="muted" className="mt-1">
            {children}
          </Body>
        ) : null}
        {actions != null ? <div className="mt-3">{actions}</div> : null}
      </div>

      {onClose != null ? (
        <IconButton a11yLabel={closeLabel} size="small" onClick={onClose} className="-mr-1 -mt-1">
          <Icon name="close" size={16} />
        </IconButton>
      ) : null}
    </div>
  );
}
