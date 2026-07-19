// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { TourTopic } from "../types";

export const tourTopicsOptions = () =>
  queryOptions({
    queryKey: queryKeys.tourTopics(),
    // Passive meta vocabulary — opt out of the re-auth modal.
    queryFn: () => apiJson<TourTopic[]>("/v1/meta/tour-topics", { interactive: false }),
    // Near-static controlled vocabulary — the twin of tourFeatureOptionsQuery, so it uses the same
    // policy: `staleTime: Infinity` keeps it fresh for the QueryClient's lifetime, so remounts (the
    // header renders this on every navigation) don't refetch; focus-refetch is already disabled at
    // the provider. The header lives on the persistent (public) layout, so its observer stays
    // mounted across in-group navigation and the query isn't GC'd — no custom gcTime needed.
    staleTime: Infinity,
  });
