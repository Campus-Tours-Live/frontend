"use client";

import { useQuery } from "@tanstack/react-query";
import { guideNextTourOptions } from "../queries/guide-next-tour.query";

/** The signed-in guide's next confirmed tour, refreshed while the dashboard is visible. */
export function useGuideNextTour() {
  return useQuery(guideNextTourOptions());
}
