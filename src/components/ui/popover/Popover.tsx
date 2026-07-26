"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Popover — a generic anchored overlay (CTL-55). Portaled to `<body>` so no
 * scrolling/overflow ancestor can clip it, and positioned near `anchorEl`
 * (below by default, flipped above and clamped to the viewport when there isn't
 * room — the same approach the TimePicker dropdown uses). Non-modal: pass
 * `onClose` to dismiss on outside-pointer / Escape; consumers that dismiss on
 * mouse-leave simply flip `open`.
 *
 * Intentionally style-agnostic — it only positions and z-indexes; the consumer
 * supplies the surface/box for `children`. jsdom can't measure layout, so real
 * flip/clamp positioning needs a visual check; the render/open/close logic is
 * unit-tested.
 */

/** Horizontal alignment of the popover relative to the anchor (before viewport clamping). */
export type PopoverAlign = "start" | "center" | "end";

export interface PopoverProps {
  /** Whether the popover is shown. */
  open: boolean;
  /** Element the popover positions itself against. Null → nothing renders. */
  anchorEl: HTMLElement | null;
  children: ReactNode;
  /** Dismiss on outside-pointer / Escape. Omit for hover popovers that dismiss
   *  by flipping `open` themselves. */
  onClose?: () => void;
  className?: string;
  /** Overlay role — e.g. "dialog" (default) or "tooltip" for hover summaries. */
  role?: string;
  /** Horizontal alignment to the anchor: `start` aligns left edges (default),
   *  `center` centres on the anchor, `end` aligns right edges. Vertical side is
   *  always auto (below, flipping above when there isn't room). */
  align?: PopoverAlign;
  "aria-label"?: string;
}

const GAP = 6;
const MARGIN = 8;

export function Popover({
  open,
  anchorEl,
  children,
  onClose,
  className,
  role = "dialog",
  align = "start",
  "aria-label": ariaLabel,
}: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const reposition = () => {
    const anchor = anchorEl?.getBoundingClientRect();
    /* istanbul ignore next -- defensive: every caller already checks anchorEl is truthy before
     * calling reposition, and getBoundingClientRect never returns null/undefined in jsdom */
    if (!anchor) return;
    const box = popoverRef.current?.getBoundingClientRect();
    /* istanbul ignore next -- defensive: popoverRef is attached whenever reposition runs (the
     * portal only unmounts when open/anchorEl go false, which also stops reposition being called) */
    const height = box?.height ?? 0;
    /* istanbul ignore next -- defensive: same as above — box is never undefined here */
    const width = box?.width ?? 0;
    const flipUp =
      anchor.bottom + height + GAP > window.innerHeight && anchor.top - height - GAP > 0;
    const top = flipUp ? anchor.top - height - GAP : anchor.bottom + GAP;
    const alignedLeft =
      align === "center"
        ? anchor.left + anchor.width / 2 - width / 2
        : align === "end"
          ? anchor.right - width
          : anchor.left;
    const left = Math.max(MARGIN, Math.min(alignedLeft, window.innerWidth - width - MARGIN));
    setPos({ left, top });
  };

  // Measure + place once the popover (and its children) have rendered, and
  // whenever the open state or anchor changes.
  useLayoutEffect(() => {
    if (!open || !anchorEl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPos(null);
      return;
    }
    reposition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorEl]);

  // Keep the popover pinned to the anchor while an ancestor scrolls / the window
  // resizes.
  useEffect(() => {
    if (!open || !anchorEl) return;
    const onScrollOrResize = () => reposition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorEl]);

  // Outside-pointer / Escape dismissal (only when the consumer opts in).
  useEffect(() => {
    if (!open || !onClose) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || anchorEl?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorEl]);

  if (!open || !anchorEl) return null;

  return createPortal(
    <div
      ref={popoverRef}
      role={role}
      aria-label={ariaLabel}
      className={cn("z-[80]", className)}
      style={{
        position: "fixed",
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        // Keep it out of view until measured so it doesn't flash at 0,0.
        visibility: pos ? "visible" : "hidden",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
