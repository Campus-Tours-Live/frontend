"use client";

import { useQuery } from "@tanstack/react-query";
import { toursOptions } from "../queries/tours.query";

/** Public marketplace tour catalog (GET /v1/tours). */
export function useTours() {
  return useQuery(toursOptions());
}
