import "client-only";

import { requireAuth, notifyAuthNotice } from "@/lib/auth";

/**
 * Single entry point for calls to our BFF resource API (versioned `/vN/*`).
 *
 * WHEN TO USE WHICH
 * -----------------
 *  - `apiFetch(path, init)` → for every actual `/vN` data read or write. This is
 *    the only client that should ever touch the `/vN` resource API. Pick
 *    `escalate` by asking WHO caused the request:
 *      · the user clicked/submitted/opened a protected page → `"prompt"` (default)
 *      · the page issued it by itself (header principal read, background refetch)
 *        → `"ambient"`
 *      · it is a genuinely public resource (meta vocabularies, the public tour
 *        catalog / detail, the university typeahead) → `"none"`
 *
 *    Do NOT choose `"none"` merely because a call also runs on a public page —
 *    that reasoning shipped the CTL-16 M4 bug. `/v1/userinfo` is PROTECTED and is
 *    issued only behind `useMe`'s `enabled: authenticated` gate, so a 401 there is
 *    a session that DIED, not an anonymous visitor; silencing it dropped a
 *    signed-in user onto the logged-out view. It is `"ambient"`: the death is
 *    reported, but through a banner rather than by seizing the page (see
 *    me.query.ts, and N3).
 *  - `getSession()` (see ./session) → only to answer "is the user logged in?" for
 *    a render decision. It hits `/auth/session` (not a `/vN` resource), never
 *    opens the modal. Don't use `apiFetch` for that probe — `apiFetch` rejects
 *    any non-versioned path by design.
 *
 * HOW TO USE
 * ----------
 *   const res = await apiFetch("/v1/userinfo");                 // protected read
 *   const res = await apiFetch("/v1/meta/tour-topics", { escalate: "none" });   // public
 *   const res = await apiFetch("/v1/userinfo", { escalate: "ambient" });        // background
 *   const res = await apiFetch("/v1/guide/profile", {           // mutation
 *     method: "PATCH",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(payload),
 *   });
 * Returns the `Response` (check `res.ok` yourself). With `escalate: "prompt"` it
 * may reject with `AuthCancelledError` if the user dismisses the re-auth prompt.
 *
 * BEHAVIOUR
 * ---------
 * - Least privilege: only accepts internal BFF paths and sends credentials
 *   `same-origin` (never to third-party origins).
 * - Re-auth is signalled explicitly by the BFF: only `401` WITH
 *   `Auth-Required: reauthenticate` opens the sign-in modal (via the auth gate).
 *   A plain `401`/`403` (e.g. an authorization failure) is returned to the
 *   caller and does NOT trigger re-auth.
 * - Safe methods (GET/HEAD) retry once after re-auth; mutations are not replayed
 *   automatically (set `retryAfterAuth` only when the BFF endpoint is
 *   idempotent). In our modal UX the user re-auths via a same-tab redirect, so
 *   the page unloads and the retry is effectively a no-op — but it stays correct
 *   for any future in-place re-auth.
 * - `escalate: "none"` opts a call OUT of every auth reaction: a re-auth 401 is
 *   returned as-is so the caller can read it as "logged out". This lets reads of
 *   PUBLIC resources (meta vocabularies, the tour catalog/detail, university
 *   search) share the SAME client — with its versioned-path + `same-origin`
 *   guarantees — without reacting to an anonymous visitor at all. The header and
 *   account nav are NOT in this list: they read the principal through `useMe`,
 *   which is `"ambient"` — a dead session there is reported via the notice
 *   channel and the session-expired banner, never a modal.
 */
const SAFE_METHODS = new Set(["GET", "HEAD"]);

/**
 * BFF resource paths are versioned ("/v1/…", "/v2/…", …). Match any version
 * segment instead of a literal "/v1/" so an API version bump doesn't silently
 * break every call. The guard still enforces the real invariant: only internal,
 * versioned BFF paths (never absolute/third-party URLs) go through this client.
 */
const VERSIONED_BFF_PATH = /^\/v\d+\//;

/**
 * How a re-auth 401 should surface. The distinction is WHO caused the request, because that
 * is what decides whether interrupting the user is legitimate.
 *
 *  - `"prompt"` (default) — the user asked for this (a click, a submit, opening a protected
 *    page). Blocking them to re-authenticate is expected and proportionate.
 *  - `"ambient"` — the page issued this by itself (the header's principal read, a background
 *    refetch). The user did not ask for anything, so seizing the page with a modal is not
 *    ours to do: raise a notice, let the banner state it, keep the page usable.
 *  - `"none"` — a genuinely public resource an anonymous visitor may read. A 401 here means
 *    "not signed in" and is the caller's to interpret; say nothing.
 */
export type AuthEscalation = "prompt" | "ambient" | "none";

export interface ApiFetchInit extends RequestInit {
  /** Replay this request after re-auth even if it's a mutation (idempotent only). */
  retryAfterAuth?: boolean;
  /**
   * How a re-auth 401 should surface — see {@link AuthEscalation}. Default `"prompt"`.
   *
   * Replaces the old `interactive` boolean, which could only choose between a modal and
   * silence. That binary is what forced M4 to make a background read able to seize the
   * page: the only alternative on offer was swallowing a dead session.
   */
  escalate?: AuthEscalation;
}

function isReauthRequired(res: Response): boolean {
  return res.status === 401 && res.headers.get("auth-required") === "reauthenticate";
}

export async function apiFetch(path: string, init: ApiFetchInit = {}): Promise<Response> {
  if (!VERSIONED_BFF_PATH.test(path)) {
    throw new Error(`apiFetch only accepts versioned BFF paths ("/vN/..."); got: ${path}`);
  }

  const { retryAfterAuth, escalate = "prompt", ...requestInit } = init;
  const opts: RequestInit = { credentials: "same-origin", ...requestInit };

  const res = await fetch(path, opts);
  if (escalate === "none" || !isReauthRequired(res)) return res;

  if (escalate === "ambient") {
    // The page discovered this, not the user. State it and get out of the way — the caller
    // still receives the 401 and renders its own signed-out state. No retry: there is
    // nothing to retry until the user decides to sign in.
    notifyAuthNotice("expired");
    return res;
  }

  // Free the 401 body before re-auth.
  /* istanbul ignore next -- cancel() only rejects on an already-errored stream */
  void res.body?.cancel().catch(() => undefined);

  await requireAuth(); // opens the modal; rejects (AuthCancelledError) if cancelled

  const method = (opts.method ?? "GET").toUpperCase();
  const canRetry = retryAfterAuth ?? SAFE_METHODS.has(method);
  // Our request bodies are JSON strings (reusable), so `opts` can be re-sent.
  return canRetry ? fetch(path, opts) : res;
}
