// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { MetaOption, University } from "../types";

/**
 * Typeahead search of universities. `source`:
 *   - "catalog" (default): the local table (GET /v1/universities) — seeded + any upserted schools.
 *   - "live": every U.S. school via the College Scorecard proxy (GET /v1/meta/universities); the
 *     { value, label } directory options are adapted to the catalog's University shape, with the
 *     Scorecard id as `id` (the backend upserts it into the table on guide-profile submit).
 */
export const universitySearchOptions = (
  query: string,
  enabled: boolean,
  source: "catalog" | "live" = "catalog",
) =>
  queryOptions({
    queryKey: [...queryKeys.universitySearch(query), source] as const,
    queryFn: async ({ signal }) => {
      if (source === "live") {
        const options = await apiJson<MetaOption[]>(
          `/v1/meta/universities?q=${encodeURIComponent(query)}`,
          // interactive:false — ambient public typeahead; a 401 returns to the caller instead of
          // popping the reauth modal (matches the meta-query convention, e.g. tour-topics).
          { signal, interactive: false },
        );
        return options.map(
          (o): University => ({
            id: o.value,
            name: o.label,
            shortName: null,
            city: null,
            region: null,
          }),
        );
      }
      return apiJson<University[]>(`/v1/universities?q=${encodeURIComponent(query)}&limit=8`, {
        signal,
      });
    },
    enabled,
    placeholderData: keepPreviousData,
  });
