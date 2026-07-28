import type { QueryClient } from "@tanstack/react-query";
import { patchJson } from "../http";
import { queryKeys } from "../keys";
import type { ParticipantProfile, ParticipantProfileUpdate } from "../types";

/**
 * Participant onboarding/profile update. On success the user holds (or keeps) the
 * PARTICIPANT role, so invalidate ["me"] + the profile read — the header/dashboard
 * reflect the change immediately. The hook supplies the QueryClient.
 */
export const updateParticipantProfileMutation = (qc: QueryClient) => ({
  mutationFn: (body: ParticipantProfileUpdate) =>
    patchJson<ParticipantProfile>("/v1/participant/profile", body),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: queryKeys.me() });
    qc.invalidateQueries({ queryKey: queryKeys.participantProfile() });
    qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
  },
});
