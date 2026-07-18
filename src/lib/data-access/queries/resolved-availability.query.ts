import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { ResolvedAvailability } from "../types";

/**
 * GET /v1/availability — the backend-resolved (coalesced) read: net-available occurrences
 * (UTC `Z`) + DST gap-days, reshaped by the BFF from Core's materialized occurrences. This is a
 * read-only single source of truth for the "actual availability" preview — the FE renders it and
 * never re-coalesces the rules itself.
 */
export const resolvedAvailabilityOptions = () =>
  queryOptions({
    queryKey: queryKeys.availabilityResolved(),
    queryFn: () => apiJson<ResolvedAvailability>("/v1/availability"),
  });
