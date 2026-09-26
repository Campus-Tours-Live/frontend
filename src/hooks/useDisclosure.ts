"use client";

import { useCallback, useState } from "react";

/** Manages a simple open/closed state. */
export function useDisclosure(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen);

  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const onToggle = useCallback(() => setOpen((current) => !current), []);

  return { open, setOpen, onOpen, onClose, onToggle };
}
