import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/http/serverMe";

/**
 * Staff area guard. Entry requires a staff role (ADMIN or
 * SUPPORT) and is independent of the active consumer role — a member who is also an
 * admin reaches /staff by explicit entry, not via the role switcher. Lives OUTSIDE
 * the (app) group so a staff-only account redirected here by the (app) guard does
 * not bounce back (no redirect loop).
 */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerMe();
  if (!me) redirect("/signin?returnTo=/staff");
  // A signed-in but not-yet-onboarded principal (`PendingMe` — may reach here via a manual
  // URL, stale bookmark, or second tab) carries no roles to check — CTL-97 constraint 3 sends
  // it to onboarding rather than guessing a role or crashing on the union narrowing below.
  if (me.provisioningStatus !== "PROVISIONED") redirect("/signup/role");
  if (!me.roles.includes("ADMIN") && !me.roles.includes("SUPPORT")) redirect("/dashboard");

  return <>{children}</>;
}
