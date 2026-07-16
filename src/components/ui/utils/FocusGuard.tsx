"use client";

import { useEffect, useRef, type FocusEvent, type HTMLAttributes, type ReactNode } from "react";

const FOCUSABLE =
  "a[href], button:enabled, input:enabled:not([type=hidden]), select:enabled, textarea:enabled, [tabindex], [autofocus]";

/**
 * FocusGuard — wraps content in a pair of focusable sentinels. When focus reaches a sentinel
 * (tabbing past the first/last item), `onGuard` fires so the parent can redirect it (e.g. wrap it).
 * On mount it moves focus into the guarded region. Low-level building block; most callers want
 * {@link FocusTrap}.
 */
export interface FocusGuardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  onGuard: (event: FocusEvent<HTMLDivElement>) => void;
}

export function FocusGuard({ children, onGuard, ...rest }: FocusGuardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodes = ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    // nodes[0] is the leading guard; nodes[1] is the first item inside the region.
    const handle = setTimeout(() => nodes?.[1]?.focus(), 0);
    return () => clearTimeout(handle);
  }, []);

  return (
    <div ref={ref} {...rest}>
      <div aria-hidden tabIndex={0} onFocus={onGuard} />
      <div aria-hidden tabIndex={-1} />
      {children}
      <div aria-hidden tabIndex={0} onFocus={onGuard} />
    </div>
  );
}
