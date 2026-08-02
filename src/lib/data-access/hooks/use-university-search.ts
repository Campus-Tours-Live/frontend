"use client";

import { useQuery } from "@tanstack/react-query";
import { useDebounced } from "@/hooks";
import { universitySearchOptions } from "../queries/universities.query";

/**
 * Debounced typeahead search of the live university directory. Encapsulates the debounce,
 * request cancellation (React Query's signal), and caching — callers pass the raw
 * query and an `enabled` flag.
 *
 * `source` is retained-but-ignored for call-site signature stability (see
 * {@link universitySearchOptions} — the "catalog" branch it used to select was removed).
 */
export function useUniversitySearch(
  query: string,
  options?: { enabled?: boolean; source?: "catalog" | "live" },
) {
  const debounced = useDebounced(query, 250);
  return useQuery(
    universitySearchOptions(debounced, options?.enabled ?? true, options?.source ?? "live"),
  );
}
