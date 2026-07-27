import { postJson } from "../http";
import type { Role } from "../types";

/** The bff's lean `POST /v1/session/onboarding-role` response body (Profile Contract v2 —
 *  session state, not a DB write; no full `Me`). */
export interface SetOnboardingRoleResult {
  onboardingRole: Role;
}

/**
 * Start onboarding for a role the caller does NOT yet hold — the in-app "Become a
 * Guide/Participant" affordance in `RoleSwitcher`. This replaces the old `/auth/login?role=…`
 * round-trip for that path: the caller is already authenticated, so re-running Google OAuth
 * just to set a role flag forced an unwanted account re-selection.
 *
 * The bff checks eligibility against Core (`GET /users/me/role-eligibility`) and, if eligible,
 * stashes `session.onboardingRole = role` so the onboarding route's guard
 * (`roles.includes(role) || session.onboardingRole === role`) admits the caller — a direct push
 * to `/onboarding/{role}` without this call first would 403 there. Rejects with `ApiError`:
 * 409 if `role` is already held (the caller should switch, not onboard — see
 * `setActiveRoleMutation`); 403 if not eligible (e.g. PARENT → GUIDE, code
 * `PARENT_CANNOT_BECOME_GUIDE`); 400 for a bad role.
 *
 * No cache patch: unlike `setActiveRoleMutation`, `onboardingRole` isn't part of the cached
 * `Me` — a successful call is immediately followed by a navigation to the onboarding route, so
 * nothing here needs to re-render before that happens.
 */
export const setOnboardingRoleMutation = () => ({
  mutationFn: (role: Role) =>
    postJson<SetOnboardingRoleResult>("/v1/session/onboarding-role", { role }),
});
