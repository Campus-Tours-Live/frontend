"use client";

import { useQuery } from "@tanstack/react-query";
import { tourDetailOptions } from "../queries/tours.query";

/** Single discoverable tour detail — GET /v1/tours/{id} */
export function useTourDetail(id: string) {
  return useQuery(tourDetailOptions(id));
}
