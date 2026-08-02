import { cn } from "@/lib/utils";
import { Icon } from "../icon/Icon";

export interface WizardStepsProps {
  /** Ordered step names. The array length is the total step count. */
  steps: readonly string[];
  /** Zero-based index of the active step. */
  current: number;
  className?: string;
}

/**
 * Segmented progress for a multi-step form, with three visually distinct states so "done" never
 * reads as "current":
 *   - completed (before `current`): filled bar + a ✓ next to the label,
 *   - current: filled bar + bold primary label (marked `aria-current="step"`),
 *   - upcoming: muted bar + greyed label.
 * The wrapper carries an `aria-label` naming the current position.
 */
export function WizardSteps({ steps, current, className }: WizardStepsProps) {
  return (
    <div
      className={cn("flex flex-col gap-2.5", className)}
      aria-label={`Step ${current + 1} of ${steps.length}`}
    >
      <div className="flex items-center gap-2">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            // Each bar is a muted track with a primary fill: completed fills fully, the current step
            // fills partway (reads as "in progress" so the last step never looks finished), and
            // upcoming steps stay empty.
            <span
              key={label}
              className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-pill bg-border"
            >
              {/* Always rendered (even upcoming, at w-0) so the width tweens on every state change.
                  Advancing a step plays as one continuous motion in TWO ordered beats: the bar just
                  completed animates ½→full first (no delay), then the new current bar animates 0→½
                  after a matching delay — so the previous segment fills before the next one starts,
                  never both at once. */}
              <span
                className={cn(
                  "block h-full rounded-pill bg-primary transition-[width] duration-300 ease-out",
                  done ? "w-full" : active ? "w-1/2 delay-300" : "w-0",
                )}
              />
            </span>
          );
        })}
      </div>
      <div className="flex items-start gap-2">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <span
              key={label}
              aria-current={active ? "step" : undefined}
              className={cn(
                // min-w-0 lets the label shrink/wrap instead of overflowing the card on narrow widths.
                "flex min-w-0 flex-1 items-center gap-1 text-ui-sm",
                active
                  ? "font-bold text-primary"
                  : done
                    ? "font-semibold text-primary"
                    : "font-semibold text-ink-soft/70",
              )}
            >
              {done ? (
                <Icon name="check" size={14} strokeWidth={2.5} className="text-primary" />
              ) : null}
              Step {i + 1} · {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
