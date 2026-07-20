import "client-only";

/**
 * Ambient auth notices — the non-blocking half of auth feedback.
 *
 * The auth GATE (`authGate.ts`) is a demand: it opens a prompt and makes the user answer.
 * That is correct when the user asked for something that needs a session, and wrong when a
 * background read merely discovered a problem. Wiring the background case to the gate — as this
 * app once did — let a visitor browsing a public page be seized by a modal they never asked for.
 *
 * This channel carries the quiet cases instead. A notice states a situation; the UI shows a
 * persistent banner and the page stays fully usable.
 *
 * The two notices demand OPPOSITE handling downstream — do not collapse them:
 *
 *  - `expired`      — the BFF sent a re-auth 401, which means it already CLEARED the session
 *                     cookie. The client must transition to anonymous, and offering a
 *                     sign-in affordance is right.
 *  - `unverifiable` — the BFF answered `503 AUTH_UPSTREAM_UNAVAILABLE`: Google was unreachable,
 *                     so the session could not be refreshed — but it is INTACT and the server
 *                     knows it. Going anonymous here would be a false sign-out, the very outcome
 *                     the BFF keeps the session to avoid, and a sign-in prompt would be nonsense:
 *                     nothing is wrong with their session.
 */
export type AuthNotice = "expired" | "unverifiable";

/**
 * A notice plus whatever the server told us about pacing.
 *
 * `retryAfterMs` exists so a user-facing "try again" control can respect the pace the
 * server actually asked for (the BFF sends `Retry-After: 5`) instead of inventing its own
 * cooldown that silently drifts from the BFF.
 */
export interface AuthNoticeState {
  notice: AuthNotice;
  retryAfterMs?: number;
}

type Listener = (state: AuthNoticeState | null) => void;

let listeners: Listener[] = [];
let current: AuthNoticeState | null = null;

/**
 * Subscribe to notice changes. The current notice is replayed immediately, because a notice
 * can be raised by a request that settles before the banner mounts (or after it remounts on
 * navigation) — without replay the banner would silently miss it.
 */
export function subscribeAuthNotice(listener: Listener): () => void {
  listeners.push(listener);
  listener(current);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/** Raise a notice. Repeating the current one is a no-op, so a retry storm can't thrash the UI. */
export function notifyAuthNotice(notice: AuthNotice, retryAfterMs?: number): void {
  if (current?.notice === notice && current.retryAfterMs === retryAfterMs) return;
  current = { notice, retryAfterMs };
  for (const l of listeners) l(current);
}

/** Drop the notice (recovered, or the user acted on it). */
export function clearAuthNotice(): void {
  if (current === null) return;
  current = null;
  for (const l of listeners) l(null);
}

/** Current notice — for tests and for a consumer that needs it outside React. */
export function getAuthNotice(): AuthNotice | null {
  return current?.notice ?? null;
}
