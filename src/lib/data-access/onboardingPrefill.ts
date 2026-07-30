import type { Me } from "./types";

/**
 * Name/email prefill fields the onboarding forms consume (`GuideOnboardingForm` /
 * `ParticipantOnboardingForm` currently read `me.user.firstName`/`lastName` inline — Task 4
 * wires them up to this helper instead). Kept to exactly the fields a form uses today — no
 * role-profile data (YAGNI).
 */
export interface OnboardingPrefill {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

/**
 * Derives onboarding form prefill from a `Me`. A PendingMe (first onboarding, no Core account
 * yet) prefills from the pending IDENTITY claims (the Google identity); a ProvisionedMe
 * (second-role acquisition) prefills from the provisioned user record. These are DISTINCT
 * `provisioningStatus` cases that happen to extract the same field set — `me.user` is read through
 * the `MeUser` union (both members share `firstName`/`lastName`/`email`) rather than
 * duplicating identical branches per `provisioningStatus`.
 */
export function getOnboardingPrefill(me: Me): OnboardingPrefill {
  return {
    firstName: me.user.firstName,
    lastName: me.user.lastName,
    email: me.user.email,
  };
}
