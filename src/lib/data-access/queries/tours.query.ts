// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { TourCatalogFilters, TourCatalogPage, TourDetail } from "../types";

export function toursPath(filters: TourCatalogFilters = {}) {
  const params = new URLSearchParams();
  if (filters.universityId) params.set("universityId", filters.universityId);
  for (const id of filters.topicIds ?? []) params.append("topic", id);
  if (filters.q) params.set("q", filters.q);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page != null && filters.page > 0) params.set("page", String(filters.page));
  if (filters.limit != null && filters.limit > 0) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return qs ? `/v1/tours?${qs}` : "/v1/tours";
}

/**
 * GET /v1/tours — public marketplace catalog (ACTIVE offerings only), one page at a time.
 * `placeholderData: keepPreviousData` keeps the current page visible while the next one loads, so
 * paging doesn't flash the skeleton / jump the layout on a page that isn't cached yet.
 */
export const tourCatalogOptions = (filters: TourCatalogFilters = {}) =>
  queryOptions({
    queryKey: queryKeys.tourCatalog(filters),
    queryFn: () => apiJson<TourCatalogPage>(toursPath(filters), { escalate: "none" }),
    placeholderData: keepPreviousData,
  });

/** GET /v1/tours/{id} — single discoverable tour detail. `escalate: "none"` matches its public
 *  siblings above: this is an anonymous marketplace read, so a `401` must return to the caller
 *  rather than popping the re-auth modal at a visitor who never had a session. */
export const tourDetailOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.tourDetail(id),
    queryFn: () => apiJson<TourDetail>(`/v1/tours/${encodeURIComponent(id)}`, { escalate: "none" }),
    enabled: Boolean(id),
  });
