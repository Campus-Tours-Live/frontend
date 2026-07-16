import { type HTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Body } from "../typography/Body";
import { Icon } from "../utils/Icon";
import { IconButton } from "../actions/IconButton";

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
export interface NudgeProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Prominent title line. */
  title: ReactNode;
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
  className,
  ...rest
}: NudgeProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-card border border-border bg-card p-4",
        className,
      )}
      {...rest}
    >
      {leading != null ? (
        <div className="flex shrink-0 items-center text-ink-soft">{leading}</div>
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
