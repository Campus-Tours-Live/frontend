"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseHoverIntentOptions {
  onOpen: () => void;
  onClose: () => void;
  closeDelay?: number;
}

/** Opens on hover and delays closing while moving between trigger and content. */
export function useHoverIntent({
  onOpen,
  onClose,
  closeDelay = 150,
}: UseHoverIntentOptions) {
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current === null) return;

    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const openNow = useCallback(() => {
    cancelClose();
    onOpen();
  }, [cancelClose, onOpen]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(onClose, closeDelay);
  }, [cancelClose, onClose, closeDelay]);

  useEffect(() => cancelClose, [cancelClose]);

  return {
    openNow,
    scheduleClose,
    cancelClose,
    triggerProps: {
      onMouseEnter: openNow,
      onMouseLeave: scheduleClose,
    },
    contentProps: {
      onMouseEnter: cancelClose,
      onMouseLeave: scheduleClose,
    },
  };
}
