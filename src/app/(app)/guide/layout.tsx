import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/http/serverMe";

/**
 * Guide workspace guard — server-side, before any /guide/* page renders.
 * Requires the GUIDE role and GUIDE as the active consumer role (matches the
 * account nav / role switcher). Non-guides and participants-with-guide-hat-off
 * are sent to the dashboard without a client-side flash.
 *
 * Nested under the (app) group, whose layout already rejects a non-PROVISIONED `me` — but
 * CTL-97 constraint 3 requires every authenticated layout to reject it explicitly, not rely on
 * a parent, so this repeats the check (defence in depth against a `PendingMe` reaching here via
 * a manual URL, stale bookmark, or second tab).
 */
export default async function GuideLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerMe();
  if (!me || me.accountState !== "PROVISIONED") redirect("/signup/role");
  if (!me.roles.includes("GUIDE") || me.currentRole !== "GUIDE") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
