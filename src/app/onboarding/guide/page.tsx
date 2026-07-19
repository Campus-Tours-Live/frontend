import { SiteHeader } from "@/components/site/SiteHeader";
import { GuideOnboardingForm } from "@/components/signup/GuideOnboardingForm";

/**
 * Guide Onboarding — route "/onboarding/guide" from design_new.
 * Application + student verification capture after account provisioning; submits
 * to PATCH /v1/guide/profile (with submit=true) which records the verification,
 * promotes the user to the GUIDE role and marks the account PENDING_GUIDE_APPROVAL.
 * The form owns its chrome (breadcrumb + Cancel + heading); this is a thin shell.
 */
export default function GuideOnboardingPage() {
  return (
    <main>
      <SiteHeader showGetStarted={false} showSearch={false} />

      <section className="mx-auto max-w-[680px] px-6 pb-24 pt-10">
        <GuideOnboardingForm />
      </section>
    </main>
  );
}
