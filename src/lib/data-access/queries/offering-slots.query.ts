import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { OfferingSlot } from "../types";

/** GET /v1/offerings/{id}/slots — participant-facing bookable slots for an offering. */
export const offeringSlotsOptions = (offeringId: string, enabled = true) =>
  queryOptions({
    queryKey: queryKeys.offeringSlots(offeringId),
    queryFn: () => apiJson<OfferingSlot[]>(`/v1/offerings/${encodeURIComponent(offeringId)}/slots`),
    enabled,
  });
