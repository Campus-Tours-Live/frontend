import type { QueryClient } from "@tanstack/react-query";
import { postJson } from "../http";
import { queryKeys } from "../keys";
import type { Offering } from "../types";

export const activateOfferingMutation = (qc: QueryClient) => ({
  mutationFn: (offeringId: string) =>
    postJson<Offering>(`/v1/guide/offerings/${offeringId}/activate`, {}),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: queryKeys.guideOfferings() });
    qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
  },
});
