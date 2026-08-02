import { getJson } from "@/lib/data-access/http";
import { meSchema } from "@/lib/data-access/me.schema";
import type { Me } from "@/lib/data-access/types";

/**
 * A deliberately UNCACHED, client-side re-read of `/v1/userinfo` — the source of truth for the
 * onboarding command's §4.3 reconcile flow (CTL-97). When the command's own response is
 * ambiguous (a 500 `SESSION_CONVERSION_FAILED`, a 409 `ROLE_ALREADY_GRANTED`, or a network
 * failure whose outcome is simply unknown), the only way to find out whether Core actually
 * committed the role grant is to ask it fresh — `cache: "no-store"` (plus a matching
 * `Cache-Control` request header) so a shared/browser HTTP cache can't serve a pre-grant
 * response and hide a just-committed change.
 *
 * Distinct from two other `Me` readers that must NOT be reused here:
 *  - `me.query.ts`'s `fetchMe` — a normal React Query fetch (respects `staleTime`); reconcile
 *    needs a fetch that bypasses caching entirely, not a "the cache is fresh enough" refetch.
 *  - `serverMe.ts`'s `getServerMe` — SSR-only (reads `next/headers`, hits the bff directly with
 *    `BFF_URL`); this module runs client-side, through the same `apiFetch`/`getJson` path every
 *    other client read uses.
 *
 * Parses the response through the SAME shared `meSchema` Task 1 introduced — no third,
 * hand-rolled parser. Unlike `fetchMe`/`getServerMe` (which both fail closed to `null`/`Me |
 * null` on a malformed body), this THROWS on any hard failure — a network error, a non-2xx
 * response (`ApiError`), or a 200 body that fails `meSchema` validation. The reconcile flow's
 * contract is `Promise<Me>` (see `onboard-role.mutation.ts`): every one of those failure modes
 * is a case reconcile must treat as terminal (rethrow), so there is no useful "no usable
 * principal" fallback value to resolve here the way the two null-returning readers can.
 */
export async function getFreshMe(): Promise<Me> {
  const raw = await getJson<unknown>("/v1/userinfo", {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
    // Ambient: the reconcile flow issues this fetch itself, in the background, in reaction to
    // an onboarding command's ambiguous result — not a fresh action the user just took. A dead
    // session here is exactly the "suspended/session-invalid" hard failure the reconcile flow's
    // caller already treats as terminal; it must be reported (never silently swallowed as a
    // plain 401), which is what `escalate: "ambient"` does (see `apiFetch`/`me.query.ts`).
    escalate: "ambient",
  });

  const parsed = meSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `getFreshMe: /v1/userinfo response failed meSchema validation: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}
