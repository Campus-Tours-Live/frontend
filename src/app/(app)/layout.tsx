import { redirect } from "next/navigation";
import { AppShell } from "@/components/site/AppShell";
import { getServerMe } from "@/lib/http/serverMe";

/**
 * Layout + access guard for the signed-in app area. The guard
 * is server-side and keyed on HELD ROLES (authorization is never the client's job)
 * before any page in the group renders:
 *   - no session / no role           → /signup/role (finish onboarding to get a role)
 *   - staff-only (no consumer role)  → /staff (the shared /dashboard has no view for them)
 *
 * Direct-URL access is blocked here too — the switcher/nav are only the happy path.
 * AppShell stays a client component: it owns the chrome, not the guard.
 */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerMe();
  const roles = me?.roles ?? [];

  if (roles.length === 0) redirect("/signup/role");
  if (!roles.includes("PARTICIPANT") && !roles.includes("GUIDE")) redirect("/staff");

  return <AppShell>{children}</AppShell>;
}
