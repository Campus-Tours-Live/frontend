"use client";

import {
  useEffect,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/**
 * FocusTrap — keeps keyboard focus inside its subtree (for modals, drawers, menus). On mount it
 * focuses the first focusable child; Tab / Shift+Tab wrap at the ends; on unmount it returns focus to
 * whatever was focused before (unless `hasFocusReturn={false}`). Set `disabled` to switch it off.
 *
 * Pass `excludeInitialFocus` (a ref to e.g. a close button) to keep that control out of the *initial*
 * focus — it stays reachable via Tab, but focus lands on the first other control instead.
 *
 * Dependency-free (no react-focus-lock) — covers keyboard navigation; it does not police
 * mouse-driven focus escapes, which isn't needed for our overlay components.
 */
export interface FocusTrapProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** @default false */
  disabled?: boolean;
  /** Return focus to the previously-focused element on unmount. @default true */
  hasFocusReturn?: boolean;
  /** A focusable inside the trap to skip when choosing the initial focus (e.g. a close button). */
  excludeInitialFocus?: RefObject<HTMLElement | null>;
}

export function FocusTrap({
  children,
  disabled = false,
  hasFocusReturn = true,
  excludeInitialFocus,
  onKeyDown,
  ...rest
}: FocusTrapProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (disabled) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const items = getFocusable(rootRef.current);
    const skip = excludeInitialFocus?.current ?? null;
    // Prefer the first control that isn't the excluded one; fall back to the first focusable.
    const initial = items.find((el) => el !== skip) ?? items[0];
    initial?.focus();
    return () => {
      if (hasFocusReturn) restoreRef.current?.focus?.();
    };
  }, [disabled, hasFocusReturn, excludeInitialFocus]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (disabled || event.key !== "Tab") return;

    const items = getFocusable(rootRef.current);
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div ref={rootRef} onKeyDown={handleKeyDown} {...rest}>
      {children}
    </div>
  );
}
