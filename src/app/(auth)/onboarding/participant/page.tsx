import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/http/serverMe";
import { ParticipantOnboardingForm } from "@/components/signup/ParticipantOnboardingForm";

/**
 * Participant onboarding shell + access guard. Acquisition-only: a user who already holds
 * PARTICIPANT goes to their dashboard; unauthenticated to auth. Everyone else is eligible.
 *
 * Branches explicitly on `provisioningStatus` (never inferred from `roles.length`/`id`):
 *  - unauthenticated                    → /signin
 *  - PENDING                            → render (first onboarding — no roles yet)
 *  - PROVISIONED, holds PARTICIPANT     → /dashboard
 *  - PROVISIONED, no PARTICIPANT        → render (second-role acquisition; no eligibility
 *                                          block here — everyone is participant-eligible)
 */
export default async function ParticipantOnboardingPage() {
  const me = await getServerMe();
  if (!me) redirect("/signin");

  if (me.provisioningStatus === "PROVISIONED" && me.roles.includes("PARTICIPANT")) {
    redirect("/dashboard");
  }
  return (
    <section className="mx-auto max-w-[680px] px-6 pb-24 pt-10">
      <ParticipantOnboardingForm />
    </section>
  );
}
