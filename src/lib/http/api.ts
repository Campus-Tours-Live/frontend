import "client-only";

import { requireAuth } from "@/lib/auth";

/**
 * Single entry point for calls to our BFF resource API (versioned `/vN/*`).
 *
 * WHEN TO USE WHICH
 * -----------------
 *  - `apiFetch(path, init)` → for every actual `/vN` data read or write. This is
 *    the only client that should ever touch the `/vN` resource API. Use
 *    `interactive: true`
 *    (default) on protected pages so a mid-session expiry pops the re-auth modal;
 *    use `interactive: false` ONLY for reads of genuinely PUBLIC resources that an
 *    anonymous visitor is expected to make (meta vocabularies, the public tour
 *    catalog / detail, the university typeahead) where a 401 just means "not
 *    signed in" and must NOT nag an anonymous visitor with the modal.
 *
 *    Do NOT reach for `interactive: false` merely because a call also runs on a
 *    public page — that reasoning shipped the CTL-16 M4 bug. `/v1/userinfo` is
 *    PROTECTED and is issued only behind `useMe`'s `enabled: authenticated`
 *    gate, so a 401 there is a session that DIED, not an anonymous visitor;
 *    opting it out silently dropped a signed-in user onto the logged-out view.
 *    Gate the call instead, and leave it interactive (see me.query.ts).
 *  - `getSession()` (see ./session) → only to answer "is the user logged in?" for
 *    a render decision. It hits `/auth/session` (not a `/vN` resource), never
 *    opens the modal. Don't use `apiFetch` for that probe — `apiFetch` rejects
 *    any non-versioned path by design.
 *
 * HOW TO USE
 * ----------
 *   const res = await apiFetch("/v1/userinfo");                 // protected read
 *   const res = await apiFetch("/v1/meta/tour-topics", { interactive: false }); // public
 *   const res = await apiFetch("/v1/guide/profile", {           // mutation
 *     method: "PATCH",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(payload),
 *   });
 * Returns the `Response` (check `res.ok` yourself). With `interactive: true` it
 * may reject with `AuthCancelledError` if the user dismisses the re-auth modal.
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
 * - `interactive: false` opts a call OUT of the modal: a re-auth 401 is returned
 *   as-is so the caller can read it as "logged out". This lets reads of PUBLIC
 *   resources (meta vocabularies, the tour catalog/detail, university search)
 *   share the SAME client — with its versioned-path + `same-origin` guarantees —
 *   without nagging an anonymous visitor with the sign-in modal. The header and
 *   account nav are NOT in this list: they read the principal through `useMe`,
 *   which gates on `/auth/session` first and therefore stays interactive.
 */
const SAFE_METHODS = new Set(["GET", "HEAD"]);

/**
 * BFF resource paths are versioned ("/v1/…", "/v2/…", …). Match any version
 * segment instead of a literal "/v1/" so an API version bump doesn't silently
 * break every call. The guard still enforces the real invariant: only internal,
 * versioned BFF paths (never absolute/third-party URLs) go through this client.
 */
const VERSIONED_BFF_PATH = /^\/v\d+\//;

export interface ApiFetchInit extends RequestInit {
  /** Replay this request after re-auth even if it's a mutation (idempotent only). */
  retryAfterAuth?: boolean;
  /**
   * Whether a re-auth 401 should open the sign-in modal. Default `true`.
   * Set `false` for ambient reads that may run while logged out (header/nav/
   * probes): the 401 is returned to the caller instead of popping the modal.
   */
  interactive?: boolean;
}

function isReauthRequired(res: Response): boolean {
  return res.status === 401 && res.headers.get("auth-required") === "reauthenticate";
}

export async function apiFetch(path: string, init: ApiFetchInit = {}): Promise<Response> {
  if (!VERSIONED_BFF_PATH.test(path)) {
    throw new Error(`apiFetch only accepts versioned BFF paths ("/vN/..."); got: ${path}`);
  }

  const { retryAfterAuth, interactive = true, ...requestInit } = init;
  const opts: RequestInit = { credentials: "same-origin", ...requestInit };

  const res = await fetch(path, opts);
  // Ambient callers (interactive: false) get the raw 401 to read as "logged out".
  if (!interactive || !isReauthRequired(res)) return res;

  // Free the 401 body before re-auth.
  /* istanbul ignore next -- cancel() only rejects on an already-errored stream */
  void res.body?.cancel().catch(() => undefined);

  await requireAuth(); // opens the modal; rejects (AuthCancelledError) if cancelled

  const method = (opts.method ?? "GET").toUpperCase();
  const canRetry = retryAfterAuth ?? SAFE_METHODS.has(method);
  // Our request bodies are JSON strings (reusable), so `opts` can be re-sent.
  return canRetry ? fetch(path, opts) : res;
}
