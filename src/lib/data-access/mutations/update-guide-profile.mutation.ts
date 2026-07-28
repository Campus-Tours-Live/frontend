import type { QueryClient } from "@tanstack/react-query";
import { patchJson } from "../http";
import { queryKeys } from "../keys";
import type { GuideProfile, GuideProfileUpdate } from "../types";

/**
 * Guide application/profile update. submit=true grants GUIDE, so invalidate ["me"]
 * + the guide profile read. The hook supplies the QueryClient.
 */
export const updateGuideProfileMutation = (qc: QueryClient) => ({
  mutationFn: (body: GuideProfileUpdate) => patchJson<GuideProfile>("/v1/guide/profile", body),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: queryKeys.me() });
    qc.invalidateQueries({ queryKey: queryKeys.guideProfile() });
    qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
  },
});
