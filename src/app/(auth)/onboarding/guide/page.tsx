import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/http/serverMe";
import { getServerParticipantType } from "@/lib/http/serverParticipantType";
// Direct import, not the barrel: the barrel re-exports client-only query hooks / apiFetch,
// which a Server Component must not pull in (same rule the root layout follows).
import { MeHydration } from "@/lib/data-access/MeHydration";
import type { Me } from "@/lib/data-access/types";
import { GuideOnboardingForm } from "@/components/signup/GuideOnboardingForm";

/**
 * Both render branches below reach here with a principal the guard already resolved, so the
 * form's `useMe()` is served from the seeded cache instead of re-fetching `/auth/session` +
 * `/v1/userinfo`. The two branches pass DIFFERENT principals (a PendingMe on first onboarding,
 * a ProvisionedMe on second-role acquisition) — which is exactly what the form's prefill needs
 * to distinguish, so the seed must carry the real one, never a re-derived stand-in.
 */
function OnboardingShell({ me }: { me: Me }) {
  return (
    <section className="mx-auto max-w-[680px] px-6 pb-24 pt-10">
      <MeHydration me={me}>
        <GuideOnboardingForm />
      </MeHydration>
    </section>
  );
}

/**
 * Guide onboarding shell + access guard. Onboarding is role ACQUISITION, so a user who already
 * holds GUIDE is sent to their dashboard; an unauthenticated visitor to auth. PARENT/guardian
 * accounts can't become guides (Core enforces this at submit too — this is the upfront UX block,
 * sourced from the participant profile, replacing the removed session onboardingRole marker).
 *
 * Branches explicitly on `provisioningStatus` (never inferred from `roles.length`/`id`):
 *  - unauthenticated               → /signin
 *  - PENDING                       → render (first onboarding — no roles, no participant
 *                                     profile yet, so the PARENT eligibility check below must
 *                                     NOT run for this branch)
 *  - PROVISIONED, holds GUIDE      → /dashboard
 *  - PROVISIONED, no GUIDE, PARENT → /signup/role?error=parent_no_guide (second-role
 *                                     acquisition is ineligible for PARENT participants)
 *  - PROVISIONED, no GUIDE, other  → render (second-role acquisition)
 */
export default async function GuideOnboardingPage() {
  const me = await getServerMe();
  if (!me) redirect("/signin");

  if (me.provisioningStatus === "PENDING") return <OnboardingShell me={me} />;

  if (me.roles.includes("GUIDE")) redirect("/dashboard");
  if ((await getServerParticipantType()) === "PARENT") {
    redirect("/signup/role?error=parent_no_guide");
  }
  return <OnboardingShell me={me} />;
}
