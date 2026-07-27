"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setActiveRoleMutation } from "../mutations/set-active-role.mutation";

/** Switch the active UX role (PARTICIPANT ↔ GUIDE); on success patches the cached `me.activeRole`
 *  directly and invalidates `["dashboard"]` (role-shaped aggregate — see the mutation for why). */
export function useSetActiveRole() {
  const qc = useQueryClient();
  return useMutation(setActiveRoleMutation(qc));
}
