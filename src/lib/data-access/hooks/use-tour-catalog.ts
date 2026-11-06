"use client";

import { useQuery } from "@tanstack/react-query";
import { tourCatalogOptions } from "../queries/tours.query";
import type { TourCatalogFilters } from "../types";

/** Public marketplace catalog — GET /v1/tours */
export function useTourCatalog(
  filters: TourCatalogFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({ ...tourCatalogOptions(filters), enabled: options.enabled ?? true });
}
