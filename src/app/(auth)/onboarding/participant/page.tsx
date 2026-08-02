import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/http/serverMe";
// Direct import, not the barrel: the barrel re-exports client-only query hooks / apiFetch,
// which a Server Component must not pull in (same rule the root layout follows).
import { MeHydration } from "@/lib/data-access/MeHydration";
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
  // The guard already resolved the principal, so seed it: the form's `useMe()` reads from cache
  // instead of re-fetching `/auth/session` + `/v1/userinfo` for what the server already knew.
  return (
    <section className="mx-auto max-w-[680px] px-6 pb-24 pt-10">
      <MeHydration me={me}>
        <ParticipantOnboardingForm />
      </MeHydration>
    </section>
  );
}
