import type { QueryClient } from "@tanstack/react-query";
import { postJson } from "../http";
import { queryKeys } from "../keys";
import type { Me, Role } from "../types";

/** The bff's lean `POST /v1/session/current-role` response body (Profile Contract v2 — session
 *  state, not a DB write; no full `Me`). */
export interface SetCurrentRoleResult {
  currentRole: Role;
}

/**
 * Switch the caller's current role (UX context only — authorization is unchanged; the bff
 * validates "held" against Core on every call, no session-cached copy).
 *
 * `onSuccess` (authoritative — never `onMutate` optimistic, since the switch is
 * authorization-checked and can 403 for a not-held/disabled role) patches the cached `me` query
 * DIRECTLY with the returned `currentRole` instead of refetching `/userinfo` — `me.query.ts`
 * caches the UNWRAPPED `Me` (`apiJson` already strips the `{ data }` envelope), so the patch is
 * `p.currentRole`, not `p.data.currentRole`. `p ? {...} : p` is a no-op when nothing is cached yet
 * (never fabricate a `Me` from a role alone). `["dashboard"]` is still invalidated (not patched):
 * the aggregate is role-shaped (`kind`), so switching must refetch it to render the other area.
 * A rejected switch (403 not-held/disabled, or network/5xx) must not patch anything — callers
 * catch the rejection and surface it.
 *
 * `cancelQueries(["me"])` runs FIRST, before the patch (CTL-97) — guarding against a
 * cache-coherence race with a `["me"]` refetch already in flight. Guide/participant onboarding
 * completion does `await updateGuide/ParticipantProfileMutation` (which `invalidateQueries(["me"])`,
 * kicking off a background `/userinfo` refetch) immediately before `activateSession()` (this
 * mutation). At that instant the bff session's `currentRole` hasn't switched yet, so that refetch
 * can resolve with the STALE (still `null`/previous) `currentRole`. If it resolves AFTER this
 * `setQueryData` patch, it silently overwrites the just-switched role — the session cookie and
 * Core end up consistent (GUIDE), but the cached `me.currentRole` reverts to null, and
 * `(app)/layout.tsx`'s `if (!me?.currentRole) redirect("/signup/role")` bounces the user out of
 * the area they just unlocked. Cancelling (with the default `revert: true`) makes any such
 * in-flight fetch settle back to its pre-fetch state instead of writing its late result, so the
 * patch below is guaranteed to be the LAST write to `["me"]` regardless of resolution order.
 */
export const setCurrentRoleMutation = (qc: QueryClient) => ({
  mutationFn: (role: Role) => postJson<SetCurrentRoleResult>("/v1/session/current-role", { role }),
  onSuccess: async (result: SetCurrentRoleResult) => {
    await qc.cancelQueries({ queryKey: queryKeys.me() });
    qc.setQueryData<Me | null | undefined>(queryKeys.me(), (prev) =>
      prev ? { ...prev, currentRole: result.currentRole } : prev,
    );
    qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
  },
});
