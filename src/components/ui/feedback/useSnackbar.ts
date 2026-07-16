"use client";

import { useContext } from "react";
import { SnackbarContext } from "./SnackbarProvider";

/**
 * useSnackbar — read `addSnack` from the nearest {@link SnackbarProvider} to raise a brief,
 * bottom-of-screen message.
 *
 *   const { addSnack } = useSnackbar();
 *   addSnack({ message: "Availability saved" });
 *   addSnack({ message: "Override removed", action: { label: "Undo", onClick: restore } });
 */
export function useSnackbar() {
  return useContext(SnackbarContext);
}
