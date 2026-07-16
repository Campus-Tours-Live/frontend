"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useScrollLock, useDismiss } from "@/hooks";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { Heading } from "./Heading";

/**
 * Drawer — panel that slides in over the page (a scrim-backed overlay). Handles the backdrop (click
 * to dismiss), Escape, body scroll lock, and portalling. Always mounted so it can animate.
 *
 * Two ways to structure it:
 *  - Convenience: pass `title` (adds a header with the title + a close button that fires `onClose`)
 *    and/or `actions` (a footer). `size` sets the width for `left`/`right` drawers.
 *  - Raw: pass `header` and/or `footer` nodes yourself. When present these win over `title`/`actions`.
 *
 * With header/footer/title/actions the panel is "structured" (fixed header, scrollable body, fixed
 * footer); otherwise the whole panel scrolls.
 */
export type DrawerSide = "left" | "right" | "bottom";
export type DrawerSize = "small" | "medium" | "large";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Edge the panel slides in from. `bottom` = a full-width sheet (mobile). */
  side?: DrawerSide;
  /** Width for `left`/`right` drawers (ignored for `bottom`, which is full-width). Default "small". */
  size?: DrawerSize;
  /** Extra panel classes. */
  className?: string;
  /** Accessible name when there's no `title` (with `title`, it labels the dialog instead). */
  ariaLabel?: string;
  /** Convenience header title — renders the title + a close button. */
  title?: ReactNode;
  /** Convenience footer — action buttons (e.g. a ButtonRow). */
  actions?: ReactNode;
  /** Raw fixed top region (structured mode). Wins over `title`. */
  header?: ReactNode;
  /** Raw fixed bottom region (structured mode). Wins over `actions`. */
  footer?: ReactNode;
}

const POSITION_BY_SIDE: Record<DrawerSide, string> = {
  left: "left-0 top-0 h-full",
  right: "right-0 top-0 h-full",
  bottom:
    "inset-x-0 bottom-0 min-h-[42vh] max-h-[90vh] w-full rounded-t-[24px] sm:min-h-[36vh] sm:max-h-[85vh]",
};

const WIDTH_BY_SIZE: Record<DrawerSize, string> = {
  small: "w-[300px] max-w-[85vw]",
  medium: "w-[420px] max-w-[85vw]",
  large: "w-[560px] max-w-[90vw]",
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
  size = "small",
  className,
  ariaLabel,
  title,
  actions,
  header,
  footer,
}: DrawerProps) {
  useScrollLock(open);
  useDismiss({ enabled: open, onDismiss: onClose });
  const titleId = useId();

  // Portal-to-<body> mount gate: `document.body` doesn't exist during SSR, so the server renders
  // nothing here. Start `false` (matches the server) on the first client render too, then flip after
  // mount — otherwise the client's first render would emit the portal the server didn't, a hydration
  // mismatch. The drawer starts closed, so gating the first tick costs no visible animation.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Raw header/footer win over the title/actions conveniences.
  const resolvedHeader =
    header ??
    (title !== undefined ? (
      <div className="flex items-start justify-between gap-4">
        <Heading as="h2" id={titleId} size="large">
          {title}
        </Heading>
        <IconButton a11yLabel="Close" size="small" onClick={onClose} className="-mr-1 -mt-1">
          <Icon name="close" size={18} />
        </IconButton>
      </div>
    ) : undefined);
  const resolvedFooter = footer ?? actions;

  const structured = resolvedHeader !== undefined || resolvedFooter !== undefined;
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
        aria-label={title !== undefined ? undefined : ariaLabel}
        aria-labelledby={title !== undefined ? titleId : undefined}
        // A closed drawer is off-screen but stays mounted to animate; hide it from the a11y tree
        // so it isn't announced as a dialog (and doesn't collide with other dialogs on the page).
        aria-hidden={open ? undefined : true}
        className={cn(
          "absolute flex flex-col bg-background shadow-card transition-transform duration-200 ease-out motion-reduce:transition-none",
          POSITION_BY_SIDE[side],
          side !== "bottom" && WIDTH_BY_SIZE[size],
          overflow,
          open ? "translate-x-0 translate-y-0" : CLOSED_BY_SIDE[side],
          className,
        )}
      >
        {structured ? (
          <>
            {resolvedHeader !== undefined ? (
              <div className="shrink-0 border-b border-border px-5 py-5">{resolvedHeader}</div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
            {resolvedFooter !== undefined ? (
              <div className="shrink-0 border-t border-border p-5">{resolvedFooter}</div>
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
