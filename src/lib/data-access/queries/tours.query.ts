// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { TourSummary } from "../types";

export const toursOptions = () =>
  queryOptions({
    queryKey: queryKeys.tours(),
    // Public marketplace catalog — opt out of the re-auth modal so it renders for
    // signed-out visitors on the homepage.
    queryFn: () => apiJson<TourSummary[]>("/v1/tours", { interactive: false }),
  });
