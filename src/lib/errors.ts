import { isAuthCancelled, SIGN_IN_AGAIN_MESSAGE } from "./auth";
import { ApiError } from "./data-access/http";

/**
 * Resolve a form-submit failure to the message shown on the form's root error.
 *
 * Shared rather than inlined in each `catch`, because inlining is exactly how this bug
 * survived a first fix: the `AuthCancelledError` check was added to every helper that had a
 * NAME, and every site that built its message inline kept mis-reporting a dismissed sign-in
 * prompt as "could not save". Long forms are the worst place for that — the redirect after
 * the prompt destroys what the user typed, so "please try again" is both wrong about the
 * cause and impossible to act on.
 *
 * If you are writing a new `catch` that produces user-facing copy, route it through here (or
 * at minimum check {@link isAuthCancelled} first, BEFORE any status-code branch — a
 * cancelled sign-in is not an HTTP failure and has no status to match).
 */
export function formSubmitErrorMessage(
  err: unknown,
  copy: {
    /** Shown for a backend 422 — what the user should fix. */
    invalid: string;
    /** Shown for anything else — network, 5xx, unknown. */
    generic: string;
  },
): string {
  if (isAuthCancelled(err)) return SIGN_IN_AGAIN_MESSAGE;
  if (err instanceof ApiError && err.status === 422) return copy.invalid;
  return copy.generic;
}
