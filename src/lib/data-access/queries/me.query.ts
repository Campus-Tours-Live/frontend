// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { queryOptions } from "@tanstack/react-query";
import { ApiError, apiJson } from "../http";
import { clearAuthNotice, notifyAuthNotice } from "@/lib/auth";
import { queryKeys } from "../keys";
import { meSchema } from "../me.schema";
import type { Me } from "../types";

/** The BFF's problem `code` for its "session preserved, Google unreachable" 503. */
const AUTH_UPSTREAM_UNAVAILABLE = "AUTH_UPSTREAM_UNAVAILABLE";

/**
 * True when a principal read failed because we could not CHECK the session — not because
 * the user is signed out. The two must not be conflated: the session is intact and the
 * server knows it, so rendering this as signed-out is a false sign-out.
 */
export function isSessionUnverifiable(error: unknown): boolean {
  return (
    error instanceof ApiError && error.status === 503 && error.code === AUTH_UPSTREAM_UNAVAILABLE
  );
}

async function fetchMe(): Promise<Me | null> {
  try {
    // AMBIENT on purpose, and the wording matters — this call is where the distinction is made.
    //
    // `useMe` only issues it once the `/auth/session` probe has answered
    // `authenticated === true`, so a 401 here is never an anonymous visitor: it is a session
    // that DIED (token expired/revoked, silent refresh failed). `/auth/session` is a
    // cookie-PRESENCE check that makes no Core call, so it cannot catch that itself.
    //
    // Three positions have been held here; the third is the right one:
    //   1. silent — swallowed the dead session as `null` and dropped a signed-in user onto the
    //      logged-out view with no explanation.
    //   2. fully interactive — reported it, but by letting a BACKGROUND read open a modal on
    //      whatever page the user happened to be on, including a public one they were just
    //      browsing. An over-correction.
    //   3. `"ambient"` — the death is reported through the notice channel and the banner; the
    //      page stays usable, and the prompt is reserved for when the USER asks for something
    //      that needs a session.
    const raw = await apiJson<unknown>("/v1/userinfo", { escalate: "ambient" });
    // Recovery. A successful principal read proves both that the session is good and that
    // the BFF could reach Google, so any standing notice is now stale. Without this the
    // banner had NO production path back to nothing — only the user closing it by hand —
    // which left a recovered system looking broken.
    clearAuthNotice();
    // Same `meSchema` the server (`getServerMe`) parses with — no second, hand-rolled parser.
    // A malformed body reads as "no usable principal" (null), matching `getServerMe`'s contract.
    const parsed = meSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (error instanceof ApiError) {
      // A 401 WITHOUT the re-auth signal is a genuine "not signed in" — stay quiet.
      // A 401 WITH it already raised the `expired` notice inside apiFetch; returning null
      // here just lets the page render its signed-out state alongside the banner.
      if (error.status === 401) return null;

      // The BFF's 503: Google was unreachable, so it could not refresh — but it deliberately
      // PRESERVED the session and said so. The user is still signed in.
      if (isSessionUnverifiable(error)) {
        // Carry the server's pace through, so the banner's "Try again" cools down for as
        // long as the BFF asked instead of guessing.
        notifyAuthNotice("unverifiable", error.retryAfterMs);
        // Rethrow rather than resolving null: null asserts "signed out", which is false and
        // would flip the header to logged-out — a false sign-out through a new trigger.
        // Throwing leaves React Query's last good `data` in place.
        throw error;
      }
    }
    throw error;
  }
}

export const meOptions = () => queryOptions({ queryKey: queryKeys.me(), queryFn: fetchMe });
