"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Snack, type SnackAction } from "./Snack";

/** Options passed to `addSnack`. */
export interface SnackOptions {
  message: string;
  /** Optional single action (label + handler). Selecting it also dismisses the snack. */
  action?: SnackAction;
  /** Fired when the snack closes — by the close button, the action, or auto-dismiss. */
  onClose?: () => void;
  /** Override the auto-dismiss delay (ms). Defaults to a message-length-based duration. */
  duration?: number;
}

interface SnackbarContextValue {
  addSnack: (snack: SnackOptions) => void;
}

export const SnackbarContext = createContext<SnackbarContextValue>({
  addSnack: () => undefined,
});

/** Longer messages linger proportionally longer — matches the Living Design timing. */
function defaultDuration(message: string): number {
  return message.length > 120 ? 3500 + (message.length - 120) * 60 : 3500;
}

interface ActiveSnack extends SnackOptions {
  /** Monotonic id — keys the host so each new snack replays its enter animation. */
  id: number;
}

/** Mounts, animates in, and self-clears once. Re-keyed per snack, so mount === a fresh snack. */
function SnackHost({ snack, onClose }: { snack: ActiveSnack; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // Flip on after mount so the transition runs (from translate-y-2/opacity-0 → in).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown(true);
  }, []);

  return (
    <div
      className={cn(
        "w-full max-w-[400px] transition-all duration-200 ease-out",
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      <Snack message={snack.message} action={snack.action} onClose={onClose} />
    </div>
  );
}

/**
 * SnackbarProvider — mount once near the app root. Provides {@link useSnackbar}'s `addSnack`, shows
 * one snack at a time at the bottom-center of the screen, and auto-dismisses it after a delay.
 * The `aria-live` region is always in the DOM so assistive tech announces each new snack.
 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<ActiveSnack | null>(null);
  const idRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Read the current onClose without making `dismiss` depend on `snack` (keeps it stable).
  const onCloseRef = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    onCloseRef.current = snack?.onClose;
  }, [snack]);

  const addSnack = useCallback((next: SnackOptions) => {
    idRef.current += 1;
    setSnack({ ...next, id: idRef.current });
  }, []);

  const dismiss = useCallback(() => {
    onCloseRef.current?.();
    setSnack(null);
  }, []);

  // Auto-dismiss: reset whenever a new snack arrives.
  useEffect(() => {
    if (!snack) return;
    const delay = snack.duration ?? defaultDuration(snack.message);
    const timeout = setTimeout(dismiss, delay);
    return () => clearTimeout(timeout);
  }, [snack, dismiss]);

  const value = useMemo<SnackbarContextValue>(() => ({ addSnack }), [addSnack]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div
              aria-live="assertive"
              className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4"
            >
              {snack ? <SnackHost key={snack.id} snack={snack} onClose={dismiss} /> : null}
            </div>,
            document.body,
          )
        : null}
    </SnackbarContext.Provider>
  );
}
