"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setCurrentRoleMutation } from "../mutations/set-current-role.mutation";

/** Switch the active UX role (PARTICIPANT ↔ GUIDE); on success patches the cached `me.currentRole`
 *  directly and invalidates `["dashboard"]` (role-shaped aggregate — see the mutation for why). */
export function useSetCurrentRole() {
  const qc = useQueryClient();
  return useMutation(setCurrentRoleMutation(qc));
}
