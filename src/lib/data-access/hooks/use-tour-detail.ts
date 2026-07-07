"use client";

import { useQuery } from "@tanstack/react-query";
import { tourDetailOptions } from "../queries/tours.query";

export function useTourDetail(tourId: string) {
  return useQuery(tourDetailOptions(tourId));
}
