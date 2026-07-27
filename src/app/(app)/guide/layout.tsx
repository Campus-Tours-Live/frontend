import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/http/serverMe";

/**
 * Guide workspace guard — server-side, before any /guide/* page renders.
 * Requires the GUIDE role and GUIDE as the active consumer role (matches the
 * account nav / role switcher). Non-guides and participants-with-guide-hat-off
 * are sent to the dashboard without a client-side flash.
 */
export default async function GuideLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerMe();
  if (!me || !me.roles.includes("GUIDE") || me.currentRole !== "GUIDE") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
