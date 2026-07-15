// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { TourCatalogFilters, TourDetail, TourSummary } from "../types";

function toursPath(filters: TourCatalogFilters = {}) {
  const params = new URLSearchParams();
  if (filters.universityId) params.set("universityId", filters.universityId);
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.q) params.set("q", filters.q);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.limit != null && filters.limit > 0) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return qs ? `/v1/tours?${qs}` : "/v1/tours";
}

/** GET /v1/tours — public marketplace catalog (ACTIVE offerings only). */
export const tourCatalogOptions = (filters: TourCatalogFilters = {}) =>
  queryOptions({
    queryKey: queryKeys.tourCatalog(filters),
    queryFn: () => apiJson<TourSummary[]>(toursPath(filters), { interactive: false }),
  });

/** GET /v1/tours/{id} — single discoverable tour detail. */
export const tourDetailOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.tourDetail(id),
    queryFn: () => apiJson<TourDetail>(`/v1/tours/${encodeURIComponent(id)}`),
    enabled: Boolean(id),
  });
