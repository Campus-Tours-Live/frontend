// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { UniversityDetail } from "../types";

/**
 * GET /v1/universities/{slug} — one platform university's profile plus its live-tour stats.
 * Anonymous marketplace read, so `escalate: "none"` (a 401 returns to the caller instead of popping
 * the re-auth modal at a visitor who never had a session). Core answers 404 for a slug with no
 * platform row; that surfaces as this query's error state.
 */
export const universityDetailOptions = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.universityDetail(slug),
    queryFn: () =>
      apiJson<UniversityDetail>(`/v1/universities/${encodeURIComponent(slug)}`, {
        escalate: "none",
      }),
    enabled: Boolean(slug),
    // Stats move when a guide activates an offering; Core sends no Cache-Control for the same
    // reason, so don't hold one for long here either.
    staleTime: 60 * 1000,
  });
