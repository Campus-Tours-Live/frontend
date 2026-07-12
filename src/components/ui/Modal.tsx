"use client";

import { type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollLock, useDismiss } from "@/hooks";

/**
 * Modal — centered overlay dialog. Handles the backdrop (click to dismiss),
 * Escape to close, and body scroll lock. The panel ships with the base card
 * surface; pass `className` for sizing/overflow and `children` for its content.
 * Renders nothing while closed.
 *
 * Pass `header` and/or `footer` to opt into "structured" mode: the panel becomes
 * a viewport-capped flex column (responsive max/min height) with a fixed header,
 * a scrollable body (`children`), and a fixed footer — so long content scrolls
 * inside the modal instead of growing past the viewport. Omit both for the
 * original plain-panel behavior (unchanged for existing consumers).
 */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** id of the title element, wired to aria-labelledby. */
  labelledBy?: string;
  /** Extra panel classes (e.g. max-width, overflow-hidden). */
  className?: string;
  /** Dismiss when the backdrop is clicked (default true). */
  dismissOnBackdrop?: boolean;
  /** Fixed top region (e.g. title). Providing either `header` or `footer` switches
   *  the panel to structured mode — see the component doc comment above. */
  header?: ReactNode;
  /** Fixed bottom region (e.g. Cancel/Save actions). See `header`. */
  footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  className,
  dismissOnBackdrop = true,
  header,
  footer,
}: ModalProps) {
  useScrollLock(open);
  useDismiss({ enabled: open, onDismiss: onClose });

  if (!open) return null;

  // Structured mode: cap the panel to the viewport and split it into a fixed
  // header, a scrollable body, and a fixed footer. Fallback (neither provided):
  // render children directly in the plain panel, exactly as before.
  const structured = header !== undefined || footer !== undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismissOnBackdrop ? onClose : undefined}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div
        className={cn(
          "relative z-[61] w-full rounded-panel bg-card shadow-card",
          structured && "flex max-h-[50vh] min-h-[min(24rem,50vh)] flex-col overflow-hidden",
          className,
        )}
      >
        {structured ? (
          <>
            {/* Explicit close control (top-right) — always dismisses, independent of
                `dismissOnBackdrop`, as an additional way out beyond backdrop/Escape. */}
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute right-4 top-4 z-[62] rounded p-1 text-ink-soft transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-soft"
            >
              <X size={18} strokeWidth={1.8} aria-hidden />
            </button>
            {header !== undefined ? (
              <div className="shrink-0 border-b border-border p-6 pr-14">{header}</div>
            ) : null}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
            {footer !== undefined ? (
              <div className="shrink-0 border-t border-border p-6">{footer}</div>
            ) : null}
          </>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
