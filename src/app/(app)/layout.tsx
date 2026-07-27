import { redirect } from "next/navigation";
import { AppShell } from "@/components/site/AppShell";
import { getServerMe } from "@/lib/http/serverMe";

/**
 * Layout + access guard for the signed-in app area. The guard
 * is server-side and keyed on HELD ROLES (authorization is never the client's job)
 * before any page in the group renders:
 *   - no session / no role           → /signup/role (finish onboarding to get a role)
 *   - staff-only (no consumer role)  → /staff (the shared /dashboard has no view for them)
 *   - held role(s), no ACTIVE role   → /signup/role (bff session state, `Role | null` — see
 *                                       below); normally the login callback initialises it for a
 *                                       single held role, so this is the rare multi-role case.
 *
 * Direct-URL access is blocked here too — the switcher/nav are only the happy path.
 * AppShell stays a client component: it owns the chrome, not the guard.
 */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerMe();
  const roles = me?.roles ?? [];

  if (roles.length === 0) redirect("/signup/role");
  if (!roles.includes("PARTICIPANT") && !roles.includes("GUIDE")) redirect("/staff");
  // `activeRole` is per-session bff state, not a DB fact — it CAN be null even when roles are
  // held (see the bff auth callback: only a single held role is auto-initialised). Every page in
  // this group reads `me.activeRole` to decide what to render, so a null here has nothing to
  // render — route to the same "route by roles" landing the bff itself uses. `/signup/role`
  // resolves this: its CTAs go through `/auth/login?role=…`, and the callback's "already holds
  // requestedRole" branch just activates it (see auth/routes.ts), no re-onboarding.
  if (!me?.activeRole) redirect("/signup/role");

  return <AppShell>{children}</AppShell>;
}
