"use client";

import { useQuery } from "@tanstack/react-query";
import { enrollmentYearsQuery } from "../queries/enrollment-years.query";

/**
 * The server's enrolment-year rules (GET /v1/meta/enrollment-years) — the acceptable entry-year
 * window plus the ordered degree → longest-time-to-graduate table.
 *
 * Exposed as a hook (rather than letting callers `useQuery(enrollmentYearsQuery())` themselves) so
 * it sits on the same data-access boundary as `useDegrees`/`useMajors`: one place to mock, and no
 * component reaching past the barrel into the query definitions.
 */
export function useEnrollmentYears() {
  return useQuery(enrollmentYearsQuery());
}
