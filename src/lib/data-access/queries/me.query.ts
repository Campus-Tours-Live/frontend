// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { queryOptions } from "@tanstack/react-query";
import { ApiError, apiJson } from "../http";
import { notifyAuthNotice } from "@/lib/auth";
import { queryKeys } from "../keys";
import type { Me } from "../types";

/** The BFF's problem `code` for N2's "session preserved, Google unreachable" 503. */
const AUTH_UPSTREAM_UNAVAILABLE = "AUTH_UPSTREAM_UNAVAILABLE";

async function fetchMe(): Promise<Me | null> {
  try {
    // AMBIENT on purpose, and the wording matters — this is the one call the whole M4/N3 arc
    // is about.
    //
    // `useMe` only issues it once the `/auth/session` probe has answered
    // `authenticated === true`, so a 401 here is never an anonymous visitor: it is a session
    // that DIED (token expired/revoked, silent refresh failed). `/auth/session` is a
    // cookie-PRESENCE check that makes no Core call, so it cannot catch that itself.
    //
    // Three positions have been held here; the third is the right one:
    //   1. `interactive: false` — swallowed the dead session as `null` and dropped a
    //      signed-in user onto the logged-out view with no explanation (the M4 bug).
    //   2. fully interactive — reported it, but by letting a BACKGROUND read open a modal on
    //      whatever page the user happened to be on, including a public one they were just
    //      browsing (M4's fix, over-corrected).
    //   3. `"ambient"` — the death is reported through the notice channel and the banner;
    //      the page stays usable, and the prompt is reserved for when the USER asks for
    //      something that needs a session (N3).
    return await apiJson<Me>("/v1/userinfo", { escalate: "ambient" });
  } catch (error) {
    if (error instanceof ApiError) {
      // A 401 WITHOUT the re-auth signal is a genuine "not signed in" — stay quiet.
      // A 401 WITH it already raised the `expired` notice inside apiFetch; returning null
      // here just lets the page render its signed-out state alongside the banner.
      if (error.status === 401) return null;

      // N2's 503: Google was unreachable, so the BFF could not refresh — but it deliberately
      // PRESERVED the session and said so. The user is still signed in.
      if (error.status === 503 && error.code === AUTH_UPSTREAM_UNAVAILABLE) {
        notifyAuthNotice("unverifiable");
        // Rethrow rather than resolving null: null asserts "signed out", which is false and
        // would flip the header to logged-out — M4's original symptom via a new trigger.
        // Throwing leaves React Query's last good `data` in place.
        throw error;
      }
    }
    throw error;
  }
}

export const meOptions = () => queryOptions({ queryKey: queryKeys.me(), queryFn: fetchMe });
