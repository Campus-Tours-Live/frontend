import { redirect } from "next/navigation";
import { AppShell } from "@/components/site/AppShell";
import { getServerMe } from "@/lib/http/serverMe";

/**
 * Layout + access guard for the signed-in app area. The guard
 * is server-side and keyed on HELD ROLES (authorization is never the client's job)
 * before any page in the group renders:
 *   - no session / not PROVISIONED    → /signup/role (a `PendingMe` — signed in but hasn't
 *                                       finished onboarding to acquire a role — may reach here
 *                                       via a manual URL, stale bookmark, or second tab; CTL-97
 *                                       constraint 3 — never guess a role off a `PendingMe`,
 *                                       which carries none)
 *   - staff-only (no consumer role)  → /staff (the shared /dashboard has no view for them)
 *   - held role(s), no CURRENT role   → /signup/role (bff session state, `Role | null` — see
 *                                       below); normally the login callback initialises it for a
 *                                       single held role, so this is the rare multi-role case.
 *
 * Direct-URL access is blocked here too — the switcher/nav are only the happy path.
 * AppShell stays a client component: it owns the chrome, not the guard.
 */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerMe();
  if (!me || me.provisioningStatus !== "PROVISIONED") redirect("/signup/role");
  // `me` is a ProvisionedMe below — `roles` is guaranteed non-empty by `meSchema`.

  if (!me.roles.includes("PARTICIPANT") && !me.roles.includes("GUIDE")) redirect("/staff");
  // `currentRole` is per-session bff state, not a DB fact — it CAN be null even when roles are
  // held (see the bff auth callback: only a single held role is auto-initialised). Every page in
  // this group reads `me.currentRole` to decide what to render, so a null here has nothing to
  // render — route to the same "route by roles" landing the bff itself uses. `/signup/role`
  // resolves this: its CTAs go through `/auth/login?role=…`, and the callback's "already holds
  // requestedRole" branch just activates it (see auth/routes.ts), no re-onboarding.
  if (!me.currentRole) redirect("/signup/role");

  return <AppShell>{children}</AppShell>;
}
