import { ParticipantOnboardingForm } from "@/components/signup/ParticipantOnboardingForm";

/**
 * Participant Onboarding — route "/onboarding/participant" from design_new.
 * Phase-1 profile capture after account provisioning; submits to
 * PATCH /v1/participant/profile. The form owns its chrome (breadcrumb + Cancel +
 * heading); this is a thin shell.
 */
export default function ParticipantOnboardingPage() {
  return (
    <section className="mx-auto max-w-[680px] px-6 pb-24 pt-10">
      <ParticipantOnboardingForm />
    </section>
  );
}
