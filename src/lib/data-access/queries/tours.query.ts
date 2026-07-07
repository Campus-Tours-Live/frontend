import { queryOptions } from "@tanstack/react-query";
import { ApiError, apiJson } from "../http";
import { queryKeys } from "../keys";
import type { TourDetail, TourSummary } from "../types";

const retryTransientOnly = (failureCount: number, error: Error) =>
  !(error instanceof ApiError && error.status < 500) && failureCount < 2;

/** GET /v1/tours — ACTIVE offerings from approved guides at active universities. */
export const tourCatalogOptions = () =>
  queryOptions({
    queryKey: queryKeys.tourCatalog(),
    queryFn: () =>
      apiJson<TourSummary[]>("/v1/tours?sort=RECOMMENDED&limit=20", {
        interactive: false,
      }),
    retry: retryTransientOnly,
  });

/** GET /v1/tours/{tourId} — public marketplace detail for one offering. */
export const tourDetailOptions = (tourId: string) =>
  queryOptions({
    queryKey: queryKeys.tourDetail(tourId),
    queryFn: () =>
      apiJson<TourDetail>(`/v1/tours/${encodeURIComponent(tourId)}`, {
        interactive: false,
      }),
    retry: retryTransientOnly,
  });
