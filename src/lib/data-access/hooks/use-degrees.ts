"use client";

import { useQuery } from "@tanstack/react-query";
import { degreeOptionsQuery } from "../queries/degrees.query";

/** The degree levels a school awards (GET /v1/meta/degrees), for the onboarding degree picker. */
export function useDegrees(schoolId: string | null | undefined) {
  return useQuery(degreeOptionsQuery(schoolId ?? ""));
}
