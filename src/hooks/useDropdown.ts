"use client";

import { useDisclosure } from "./useDisclosure";
import { useDismiss } from "./useDismiss";
import { useHoverIntent } from "./useHoverIntent";

interface UseDropdownOptions {
  closeDelay?: number;
}

/** Combines open state, hover behavior, and Escape dismissal for dropdowns. */
export function useDropdown({
  closeDelay = 150,
}: UseDropdownOptions = {}) {
  const {
    open,
    setOpen,
    onClose: close,
    onToggle: toggle,
  } = useDisclosure();

  const hover = useHoverIntent({
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
    closeDelay,
  });

  useDismiss({
    enabled: open,
    onDismiss: () => setOpen(false),
  });

  return {
    open,
    setOpen,
    close,
    toggle,
    openNow: hover.openNow,
    scheduleClose: hover.scheduleClose,
    cancelClose: hover.cancelClose,
    triggerProps: hover.triggerProps,
    contentProps: hover.contentProps,
  };
}
