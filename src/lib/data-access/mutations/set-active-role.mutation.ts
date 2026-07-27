import type { QueryClient } from "@tanstack/react-query";
import { postJson } from "../http";
import { queryKeys } from "../keys";
import type { Me, Role } from "../types";

/** The bff's lean `POST /v1/session/active-role` response body (Profile Contract v2 — session
 *  state, not a DB write; no full `Me`). */
export interface SetActiveRoleResult {
  activeRole: Role;
}

/**
 * Switch the caller's active role (UX context only — authorization is unchanged; the bff
 * validates "held" against Core on every call, no session-cached copy).
 *
 * `onSuccess` (authoritative — never `onMutate` optimistic, since the switch is
 * authorization-checked and can 403 for a not-held/disabled role) patches the cached `me` query
 * DIRECTLY with the returned `activeRole` instead of refetching `/userinfo` — `me.query.ts`
 * caches the UNWRAPPED `Me` (`apiJson` already strips the `{ data }` envelope), so the patch is
 * `p.activeRole`, not `p.data.activeRole`. `p ? {...} : p` is a no-op when nothing is cached yet
 * (never fabricate a `Me` from a role alone). `["dashboard"]` is still invalidated (not patched):
 * the aggregate is role-shaped (`kind`), so switching must refetch it to render the other area.
 * A rejected switch (403 not-held/disabled, or network/5xx) must not patch anything — callers
 * catch the rejection and surface it.
 */
export const setActiveRoleMutation = (qc: QueryClient) => ({
  mutationFn: (role: Role) => postJson<SetActiveRoleResult>("/v1/session/active-role", { role }),
  onSuccess: (result: SetActiveRoleResult) => {
    qc.setQueryData<Me | null | undefined>(queryKeys.me(), (prev) =>
      prev ? { ...prev, activeRole: result.activeRole } : prev,
    );
    qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
  },
});
