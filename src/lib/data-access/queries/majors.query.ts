// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { MetaOption } from "../types";

/**
 * GET /v1/meta/majors — the fields of study a school actually offers (live College Scorecard),
 * for the guide-onboarding major picker. Keyed by the selected school id; disabled until one is
 * chosen. Reference data → never stale within a session.
 */
export const majorOptionsQuery = (schoolId: string) =>
  queryOptions({
    queryKey: queryKeys.majors(schoolId),
    queryFn: ({ signal }) =>
      apiJson<MetaOption[]>(`/v1/meta/majors?schoolId=${encodeURIComponent(schoolId)}`, { signal }),
    enabled: Boolean(schoolId),
    staleTime: Infinity,
  });
