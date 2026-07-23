/**
 * HTTP layer. Import from "@/lib/http".
 *
 *  - `apiFetch` → all `/vN/*` resource reads & writes (re-auth aware).
 *
 * "Is the user logged in?" for render decisions is answered by the data-access
 * `useMe()` hook: it first hits the always-200 `/auth/session` probe and only
 * reads the protected `/v1/userinfo` (roles[]) when that says authenticated — so
 * public / logged-out pages never call the protected endpoint.
 */
export { apiFetch } from "./api";
export type { ApiFetchInit } from "./api";
