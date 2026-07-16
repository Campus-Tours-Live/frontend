import { cn } from "@/lib/utils";
import { Icon } from "../utils/Icon";

/** An optional action shown in a {@link Snack}: a label + handler. */
export interface SnackAction {
  label: string;
  onClick?: () => void;
}

export interface SnackProps {
  message: string;
  action?: SnackAction;
  /** Dismiss handler (fired by the close button and, via the provider, the action). */
  onClose: () => void;
  className?: string;
}

/**
 * Snack — the visual toast bar (dark surface, bottom of screen): a message, an optional text action,
 * and a close button. Presentational only; {@link SnackbarProvider} manages showing/timing it.
 */
export function Snack({ message, action, onClose, className }: SnackProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-3 rounded-lg bg-ink px-4 py-3 text-[14px] text-white shadow-lg",
        className,
      )}
    >
      <span className="min-w-0 flex-1">{message}</span>

      {action ? (
        <button
          type="button"
          onClick={() => {
            action.onClick?.();
            onClose();
          }}
          className="shrink-0 text-[13px] font-bold text-primary-soft hover:underline"
        >
          {action.label}
        </button>
      ) : null}

      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/40"
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
