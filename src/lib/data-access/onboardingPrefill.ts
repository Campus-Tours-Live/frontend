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
 * Derives onboarding form prefill from a `Me`. Branches on `accountState` — a PendingMe (first
 * onboarding, no Core account yet) prefills from the pending IDENTITY claims (the Google
 * identity); a ProvisionedMe (second-role acquisition) prefills from the provisioned user
 * record. These are DISTINCT `accountState` cases even though the extracted field set happens
 * to overlap — each branch narrows on `accountState` before reading `me.user`, rather than
 * reading fields off the union unnarrowed.
 */
export function getOnboardingPrefill(me: Me): OnboardingPrefill {
  if (me.accountState === "PENDING") {
    return {
      firstName: me.user.firstName,
      lastName: me.user.lastName,
      email: me.user.email,
    };
  }

  return {
    firstName: me.user.firstName,
    lastName: me.user.lastName,
    email: me.user.email,
  };
}
