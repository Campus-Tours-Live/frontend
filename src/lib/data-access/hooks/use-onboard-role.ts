"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { onboardRoleMutation } from "@/lib/data-access/mutations/onboard-role.mutation";
import type { OnboardableRole } from "@/lib/data-access/mutations/onboard-role.mutation";

/**
 * The onboarding COMMAND mutation (CTL-97 defer-provisioning): `mutate({ role, body })` POSTs to
 * `/v1/users/me/roles/{role}` and resolves the `ProvisionedMe` once the role is CONFIRMED held —
 * either from the command's own `201`, or from the mutation's §4.3 typed reconcile flow (see
 * `onboard-role.mutation.ts`). On success the cached `["me"]`/`["dashboard"]` are already
 * patched/invalidated by the mutation itself; this hook adds no `onSuccess` of its own.
 *
 * `retry: false` is set on the underlying mutation (`onboardRoleMutation`), not repeated here —
 * a lost-response auto-retry would replay the command against Core, which the reconcile flow
 * (not React Query) is responsible for deciding.
 */
export function useOnboardRole() {
  const qc = useQueryClient();
  return useMutation(onboardRoleMutation(qc));
}

export type { OnboardableRole };
