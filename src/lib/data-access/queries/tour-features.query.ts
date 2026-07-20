// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { TourFeatureOptionsByTopic } from "../types";

/**
 * GET /v1/meta/tour-features — the controlled feature vocabulary grouped by topic (single source of
 * truth on the backend). Reference data that rarely changes, so it never goes stale within a
 * session; consumers build a code→label map for the card and per-topic options for the create form.
 */
export const tourFeatureOptionsQuery = () =>
  queryOptions({
    queryKey: queryKeys.tourFeatures(),
    queryFn: () =>
      apiJson<TourFeatureOptionsByTopic>("/v1/meta/tour-features", { escalate: "none" }),
    staleTime: Infinity,
  });
