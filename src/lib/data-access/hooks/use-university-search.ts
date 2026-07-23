"use client";

import { useQuery } from "@tanstack/react-query";
import { useDebounced } from "@/hooks";
import { universitySearchOptions } from "../queries/universities.query";

/**
 * Debounced typeahead search of the university catalog. Encapsulates the debounce,
 * request cancellation (React Query's signal), and caching — callers pass the raw
 * query and an `enabled` flag.
 */
export function useUniversitySearch(
  query: string,
  options?: { enabled?: boolean; source?: "catalog" | "live" },
) {
  const debounced = useDebounced(query, 250);
  return useQuery(
    universitySearchOptions(debounced, options?.enabled ?? true, options?.source ?? "catalog"),
  );
}
