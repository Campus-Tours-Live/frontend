// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { MetaOption } from "../types";

/**
 * GET /v1/meta/degrees — the degree levels a school awards (live College Scorecard credential
 * titles, e.g. "Bachelor's Degree"), for the guide-onboarding degree picker. Keyed by the selected
 * school id; disabled until one is chosen. Reference data → never stale within a session.
 */
export const degreeOptionsQuery = (schoolId: string) =>
  queryOptions({
    queryKey: queryKeys.degrees(schoolId),
    queryFn: ({ signal }) =>
      apiJson<MetaOption[]>(`/v1/meta/degrees?schoolId=${encodeURIComponent(schoolId)}`, {
        signal,
      }),
    enabled: Boolean(schoolId),
    staleTime: Infinity,
  });
