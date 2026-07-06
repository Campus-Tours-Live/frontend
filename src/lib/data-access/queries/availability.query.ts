import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { AvailabilitySummary } from "../types";

/** GET /v1/guide/availability — recurring rules, exceptions, and booking policy. */
export const guideAvailabilityOptions = () =>
  queryOptions({
    queryKey: queryKeys.guideAvailability(),
    queryFn: () => apiJson<AvailabilitySummary>("/v1/guide/availability"),
  });
