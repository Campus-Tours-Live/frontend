"use client";

import { useEffect, type RefObject } from "react";

interface UseDismissOptions {
  enabled: boolean;
  onDismiss: () => void;
  escape?: boolean;
  outside?: boolean;
  ref?: RefObject<HTMLElement | null>;
}

/** Closes an overlay with Escape or an outside pointer press. */
export function useDismiss({
  enabled,
  onDismiss,
  escape = true,
  outside = false,
  ref,
}: UseDismissOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (escape && event.key === "Escape") {
        onDismiss();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const element = ref?.current;

      if (element && !element.contains(event.target as Node)) {
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    if (outside) {
      document.addEventListener("pointerdown", handlePointerDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);

      if (outside) {
        document.removeEventListener("pointerdown", handlePointerDown);
      }
    };
  }, [enabled, onDismiss, escape, outside, ref]);
}
