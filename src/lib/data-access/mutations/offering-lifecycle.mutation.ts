import type { QueryClient } from "@tanstack/react-query";
import { patchJson, postJson } from "../http";
import { queryKeys } from "../keys";
import type { Offering, UpdateOfferingInput } from "../types";

function invalidateOfferingViews(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.guideOfferings() });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
  qc.invalidateQueries({ queryKey: ["tour-catalog"] });
}

export const updateOfferingMutation = (qc: QueryClient) => ({
  mutationFn: ({ offeringId, body }: { offeringId: string; body: UpdateOfferingInput }) =>
    patchJson<Offering>(`/v1/guide/offerings/${offeringId}`, body),
  onSuccess: (
    _data: Offering,
    { offeringId }: { offeringId: string; body: UpdateOfferingInput },
  ) => {
    invalidateOfferingViews(qc);
    qc.invalidateQueries({ queryKey: queryKeys.tourDetail(offeringId) });
  },
});

export const pauseOfferingMutation = (qc: QueryClient) => ({
  mutationFn: (offeringId: string) =>
    postJson<Offering>(`/v1/guide/offerings/${offeringId}/pause`, {}),
  onSuccess: (_data: Offering, offeringId: string) => {
    invalidateOfferingViews(qc);
    qc.invalidateQueries({ queryKey: queryKeys.tourDetail(offeringId) });
  },
});

export const retireOfferingMutation = (qc: QueryClient) => ({
  mutationFn: (offeringId: string) =>
    postJson<Offering>(`/v1/guide/offerings/${offeringId}/retire`, {}),
  onSuccess: (_data: Offering, offeringId: string) => {
    invalidateOfferingViews(qc);
    qc.invalidateQueries({ queryKey: queryKeys.tourDetail(offeringId) });
  },
});

export const duplicateOfferingMutation = (qc: QueryClient) => ({
  mutationFn: (offeringId: string) =>
    postJson<Offering>(`/v1/guide/offerings/${offeringId}/duplicate`, {}),
  onSuccess: () => invalidateOfferingViews(qc),
});
