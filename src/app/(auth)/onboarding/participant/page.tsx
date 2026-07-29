import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/http/serverMe";
import { ParticipantOnboardingForm } from "@/components/signup/ParticipantOnboardingForm";

/**
 * Participant onboarding shell + access guard. Acquisition-only: a user who already holds
 * PARTICIPANT goes to their dashboard; unauthenticated to auth. Everyone else is eligible.
 */
export default async function ParticipantOnboardingPage() {
  const me = await getServerMe();
  if (!me) redirect("/signin");
  // A PENDING principal holds no roles yet (first onboarding) — only a PROVISIONED `me` can
  // already hold PARTICIPANT (second-role acquisition is Task 2; this preserves today's
  // behaviour for a PendingMe, which never matches, while narrowing `roles` for the union).
  if (me.accountState === "PROVISIONED" && me.roles.includes("PARTICIPANT")) redirect("/dashboard");
  return (
    <section className="mx-auto max-w-[680px] px-6 pb-24 pt-10">
      <ParticipantOnboardingForm />
    </section>
  );
}
