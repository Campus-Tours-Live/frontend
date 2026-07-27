"use client";

import { useMutation } from "@tanstack/react-query";
import { setOnboardingRoleMutation } from "../mutations/set-onboarding-role.mutation";

/** Start onboarding for a role the caller doesn't yet hold — the in-app "Become a
 *  Guide/Participant" flow (see `RoleSwitcher`). No cache patch; see the mutation for why. */
export function useSetOnboardingRole() {
  return useMutation(setOnboardingRoleMutation());
}
