"use client";

import { useQuery } from "@tanstack/react-query";
import { majorOptionsQuery } from "../queries/majors.query";

/** The majors a school offers (GET /v1/meta/majors), for the onboarding major picker. */
export function useMajors(schoolId: string | null | undefined) {
  return useQuery(majorOptionsQuery(schoolId ?? ""));
}
