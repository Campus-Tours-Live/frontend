import "client-only";

/**
 * Re-authentication gate (client-side, fine-grained).
 *
 * A tiny framework-agnostic singleton that bridges the API layer (plain modules)
 * and the React modal. When an in-page request gets a re-auth 401 — i.e. the
 * session expired or was revoked WHILE the user is already on a page — the API
 * layer calls `requireAuth()`, which opens the sign-in modal and returns a
 * promise that resolves once the user has re-authenticated (or rejects if they
 * cancel). Multiple concurrent 401s share the same pending promise, so the modal
 * opens once and every queued request settles together.
 *
 * Our re-auth UX keeps the modal: the user clicks "Continue with Google", which
 * does a same-tab redirect (the page unloads, so the promise simply never
 * resolves — harmless). Cancelling rejects with AuthCancelledError.
 *
 * Cancel suppression, scoped to an AUTH EPOCH: after the user cancels, background
 * requests that 401 (e.g. polling / refetch) must NOT keep re-opening the modal.
 * But "don't nag me right now" is not "never ask me again" — so the decline is
 * recorded against the current epoch rather than in a sticky flag, and any auth
 * event that advances the epoch (a route change via `advanceAuthEpoch()`, a
 * successful `completeAuth()`, an explicit `requireAuth({ force: true })`) lets
 * the prompt open again.
 *
 * This distinction is the N1a defect: a permanent flag meant one Cancel disabled
 * re-auth for the whole page lifetime — including a deliberate "Book this tour"
 * clicked minutes later, which then failed with a generic error. Only a full page
 * reload recovered, because nothing in production ever cleared the flag.
 *
 * Division of responsibility:
 *  - This gate handles ONLY the mid-session, interactive case (needs UI), so it
 *    cannot live in middleware.
 *  - Coarse, pre-render route protection for navigations is handled in
 *    `src/proxy.ts` (Next 16 Proxy convention; redirect before render).
 *  - The BFF is the source of truth (silent refresh; otherwise 401 +
 *    `Auth-Required: reauthenticate`). Only that signal opens this gate.
 */
type Listener = (open: boolean) => void;

export class AuthCancelledError extends Error {
  constructor(message = "Sign-in was cancelled.") {
    super(message);
    this.name = "AuthCancelledError";
  }
}

/**
 * What to show the user when their own dismissal is what stopped a request.
 *
 * Shared so every "error → message" helper attributes this the same way. Getting it wrong
 * is worse than saying nothing: telling someone their hours/override/booking "could not be
 * saved" when the write was never attempted sends them retrying, then bug-reporting.
 */
export const SIGN_IN_AGAIN_MESSAGE = "Please sign in again to continue.";

/**
 * True when a request failed because the user dismissed the sign-in prompt — a user
 * decision, NOT a failure of the action they were attempting. Check this FIRST in any
 * error-to-message helper, before status-code branches, since it is not an HTTP failure.
 */
export function isAuthCancelled(err: unknown): err is AuthCancelledError {
  return err instanceof AuthCancelledError;
}

let listeners: Listener[] = [];
let pending: Promise<void> | null = null;
let resolvePending: (() => void) | null = null;
let rejectPending: ((reason: Error) => void) | null = null;
/** Monotonic counter; every auth event advances it. */
let epoch = 0;
/** The epoch the user declined in, or null if they haven't. Never a bare boolean. */
let declinedAtEpoch: number | null = null;

function emit(open: boolean): void {
  for (const l of listeners) l(open);
}

/** The modal subscribes here to learn when to open/close. */
export function subscribeAuthGate(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/**
 * Open the modal (if not already) and wait for re-authentication.
 * While suppressed (after a cancel), rejects immediately unless `force` is set.
 */
export function requireAuth(options: { force?: boolean } = {}): Promise<void> {
  if (declinedAtEpoch === epoch && !options.force) {
    return Promise.reject(new AuthCancelledError());
  }
  if (options.force) declinedAtEpoch = null;

  if (!pending) {
    pending = new Promise<void>((resolve, reject) => {
      resolvePending = resolve;
      rejectPending = reject;
    });
    emit(true);
  }
  return pending;
}

function reset(): void {
  pending = null;
  resolvePending = null;
  rejectPending = null;
}

/** Called once re-authentication has succeeded (e.g. a popup reports success). */
export function completeAuth(): void {
  const resolve = resolvePending;
  epoch += 1; // a successful sign-in is the clearest auth event there is
  declinedAtEpoch = null;
  reset();
  emit(false);
  resolve?.();
}

/** Called when the user dismisses the modal without signing in. */
export function cancelAuth(): void {
  const reject = rejectPending;
  // Suppress background 401s for THIS epoch only — see the epoch note at the top.
  declinedAtEpoch = epoch;
  reset();
  emit(false);
  reject?.(new AuthCancelledError());
}

/**
 * Advance the auth epoch, lifting any decline recorded in the previous one.
 *
 * Called on navigation (see `AuthGateSync`): a user who dismissed the prompt on one page
 * has not decided anything about the next one, and the alternative — carrying the decline
 * forward forever — is the bug this replaced. Cheap and idempotent-ish: advancing without
 * a prior decline is a no-op in effect.
 */
export function advanceAuthEpoch(): void {
  epoch += 1;
}

/**
 * Clear post-cancel suppression (e.g. the user explicitly chooses to sign in).
 *
 * Advances the epoch rather than zeroing it: `epoch` is documented as monotonic, and a
 * reset that rewinds it would break that invariant for anything that ever compares epochs
 * across a reset.
 */
export function resetAuthGate(): void {
  declinedAtEpoch = null;
  epoch += 1;
  reset();
}
