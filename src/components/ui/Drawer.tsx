"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useScrollLock, useDismiss } from "@/hooks";

/**
 * Drawer — panel that slides in over the page. Handles the backdrop (click to dismiss),
 * Escape, and body scroll lock. Always mounted so it can animate; pass `className` for the
 * panel size and `children` for its content.
 *
 * Pass `header` and/or `footer` to opt into "structured" mode (mirrors {@link Modal}): a fixed
 * header, a scrollable body (`children`), and a fixed footer — so long content scrolls inside the
 * sheet with the actions pinned. Omit both for a plain panel (the whole panel scrolls).
 */
export type DrawerSide = "left" | "right" | "bottom";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Edge the panel slides in from. `bottom` = a full-width sheet (mobile). */
  side?: DrawerSide;
  /** Extra panel classes (e.g. width). */
  className?: string;
  ariaLabel?: string;
  /** Fixed top region (structured mode — see the component doc). */
  header?: ReactNode;
  /** Fixed bottom region, e.g. Cancel/Save (structured mode). */
  footer?: ReactNode;
}

const PANEL_BY_SIDE: Record<DrawerSide, string> = {
  left: "left-0 top-0 h-full w-[300px] max-w-[85vw]",
  right: "right-0 top-0 h-full w-[300px] max-w-[85vw]",
  bottom:
    "inset-x-0 bottom-0 min-h-[42vh] max-h-[90vh] w-full rounded-t-[24px] sm:min-h-[36vh] sm:max-h-[85vh]",
};

const CLOSED_BY_SIDE: Record<DrawerSide, string> = {
  left: "-translate-x-full",
  right: "translate-x-full",
  bottom: "translate-y-full",
};

export function Drawer({
  open,
  onClose,
  children,
  side = "left",
  className,
  ariaLabel,
  header,
  footer,
}: DrawerProps) {
  useScrollLock(open);
  useDismiss({ enabled: open, onDismiss: onClose });

  // Portal-to-<body> mount gate: `document.body` doesn't exist during SSR, so the server renders
  // nothing here. Start `false` (matches the server) on the first client render too, then flip after
  // mount — otherwise the client's first render would emit the portal the server didn't, a hydration
  // mismatch. The drawer starts closed, so gating the first tick costs no visible animation.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const structured = header !== undefined || footer !== undefined;
  // Structured mode scrolls the body (not the panel); a plain bottom sheet scrolls the whole panel.
  const overflow = structured ? "overflow-hidden" : side === "bottom" ? "overflow-y-auto" : "";

  // Portal to <body> so the backdrop/panel are positioned against the viewport (never clipped by an
  // ancestor's transform/overflow). Only after mount (see the gate above), so it never runs on the
  // server and both SSR + first client render agree on "nothing here".
  if (!mounted) return null;

  return createPortal(
    // Viewport-sized clip layer: a closed drawer stays mounted to animate, so its panel sits
    // off-screen (translated out). `overflow-hidden` here clips that off-screen panel so it can't
    // inflate the document's scroll size (a horizontal/vertical scrollbar into empty space). It
    // clips because the panel below is `absolute` (an ancestor's overflow clips absolute — but not
    // fixed — descendants). `pointer-events-none` while closed lets the page underneath stay clickable.
    <div className={cn("fixed inset-0 z-[55] overflow-hidden", open ? "" : "pointer-events-none")}>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        // A closed drawer is off-screen but stays mounted to animate; hide it from the a11y tree
        // so it isn't announced as a dialog (and doesn't collide with other dialogs on the page).
        aria-hidden={open ? undefined : true}
        className={cn(
          "absolute flex flex-col bg-background shadow-card transition-transform duration-200 ease-out motion-reduce:transition-none",
          PANEL_BY_SIDE[side],
          overflow,
          open ? "translate-x-0 translate-y-0" : CLOSED_BY_SIDE[side],
          className,
        )}
      >
        {structured ? (
          <>
            {header !== undefined ? (
              <div className="shrink-0 border-b border-border px-5 py-5">{header}</div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
            {footer !== undefined ? (
              <div className="shrink-0 border-t border-border p-5">{footer}</div>
            ) : null}
          </>
        ) : (
          children
        )}
      </div>
    </div>,
    document.body,
  );
}
