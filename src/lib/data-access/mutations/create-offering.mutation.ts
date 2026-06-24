import type { QueryClient } from "@tanstack/react-query";
import { postJson } from "../http";
import { queryKeys } from "../keys";
import type { CreateOfferingInput, Offering } from "../types";

export const createOfferingMutation = (qc: QueryClient) => ({
  mutationFn: (body: CreateOfferingInput) => postJson<Offering>("/v1/guide/offerings", body),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: queryKeys.guideOfferings() });
    qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
  },
});
