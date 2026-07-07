"use client";

import { useQuery } from "@tanstack/react-query";
import { tourCatalogOptions } from "../queries/tours.query";

export function useTourCatalog() {
  return useQuery(tourCatalogOptions());
}
