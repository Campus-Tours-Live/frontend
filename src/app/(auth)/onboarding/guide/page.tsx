import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/http/serverMe";
import { getServerParticipantType } from "@/lib/http/serverParticipantType";
import { GuideOnboardingForm } from "@/components/signup/GuideOnboardingForm";

/**
 * Guide onboarding shell + access guard. Onboarding is role ACQUISITION, so a user who already
 * holds GUIDE is sent to their dashboard; an unauthenticated visitor to auth. PARENT/guardian
 * accounts can't become guides (Core enforces this at submit too — this is the upfront UX block,
 * sourced from the participant profile, replacing the removed session onboardingRole marker).
 */
export default async function GuideOnboardingPage() {
  const me = await getServerMe();
  if (!me) redirect("/signin");
  if (me.roles.includes("GUIDE")) redirect("/dashboard");
  if ((await getServerParticipantType()) === "PARENT") {
    redirect("/signup/role?error=parent_no_guide");
  }
  return (
    <section className="mx-auto max-w-[680px] px-6 pb-24 pt-10">
      <GuideOnboardingForm />
    </section>
  );
}
