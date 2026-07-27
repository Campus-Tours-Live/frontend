// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { MetaOption, University } from "../types";

/**
 * Typeahead search of universities against the live directory (every U.S. school via the College
 * Scorecard proxy, GET /v1/meta/universities). The { value, label } directory options are adapted
 * to the catalog's University shape, with the Scorecard id as `id` (the backend upserts it into
 * the table on guide-profile submit).
 *
 * `_source` is retained-but-ignored for call-site signature stability: this used to also support a
 * "catalog" branch (the local table's search endpoint), which was removed once its only consumer
 * — the offering form's picker — switched to a read-only verified-campus display (CTL-97).
 */
export const universitySearchOptions = (
  query: string,
  enabled: boolean,
  _source: "catalog" | "live" = "live",
) =>
  queryOptions({
    queryKey: [...queryKeys.universitySearch(query), "live"] as const,
    queryFn: async ({ signal }) => {
      const options = await apiJson<MetaOption[]>(
        `/v1/meta/universities?q=${encodeURIComponent(query)}`,
        // `none`, not `ambient`: this is a public directory an anonymous visitor may search, so
        // a 401 here means "not signed in" and is the caller's to interpret — there is nothing to
        // report. `ambient` would raise a session notice, which only makes sense for a read that
        // implies a session (matches the other meta queries, e.g. tour-topics).
        { signal, escalate: "none" },
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
    },
    enabled,
    placeholderData: keepPreviousData,
  });
