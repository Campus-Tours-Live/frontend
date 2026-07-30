// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { EnrollmentYearRules } from "../types";

/**
 * Runtime-validated because the whole point of this endpoint is that the client stops guessing
 * these numbers. A malformed payload must fail closed (fields stay disabled) rather than silently
 * fall back to a hardcoded window — that fallback is exactly the duplication being deleted.
 */
const yearRangeSchema = z
  .object({ min: z.number().int(), max: z.number().int() })
  .refine(({ min, max }) => min <= max, { message: "entryYear.min must not exceed max" });

/**
 * Keywords must be non-blank, and this is not cosmetic. `"anything".includes("")` is TRUE for
 * every string, so one empty keyword makes its group match EVERY degree and swallow the table.
 * `.min(1)` alone does not close it: `" "` passes a length check, and
 * `"Doctoral Degree".includes(" ")` is also true — a single space is the same bug wearing a
 * disguise. Hence the trim-aware refine.
 *
 * The lowercase check is a contract assertion, not defensiveness: the client lowercases the
 * degree before matching, so an upper-case keyword from the server could never match anything.
 * Better to fail closed and show the retry than to apply a rule that silently never fires.
 */
const degreeRuleSchema = z.object({
  matches: z
    .array(
      z
        .string()
        .refine((v) => v.trim().length > 0, { message: "keyword must not be blank" })
        .refine((v) => v === v.trim() && v === v.toLowerCase(), {
          message: "keyword must be a trimmed lower-case string",
        }),
    )
    .min(1),
  years: z.number().int().positive(),
});

export const enrollmentYearRulesSchema = z.object({
  entryYear: yearRangeSchema,
  maxYearsToGraduate: z.array(degreeRuleSchema).min(1),
  defaultMaxYearsToGraduate: z.number().int().positive(),
});

/**
 * GET /v1/meta/enrollment-years — the acceptable enrolment-year window plus the ordered
 * degree → longest-time-to-graduate table.
 *
 * `staleTime` is ONE HOUR, unlike the neighbouring `degrees`/`majors` queries which are
 * `Infinity`. Those are not time-derived; this payload's `entryYear` window dies the moment the
 * server's year changes.
 *
 * `staleTime` ALONE WOULD NOT DELIVER THAT. It only marks data stale — it never triggers a fetch.
 * Refetching happens on mount, on window focus, on reconnect, or on an explicit invalidate, and
 * this app's QueryProvider sets `refetchOnWindowFocus: false` globally. So on a form left open
 * across midnight the only remaining trigger is a remount that may never come, and the tab would
 * keep last year's window indefinitely — exactly what spec I6 says cannot happen.
 *
 * Hence the explicit `refetchInterval`, and the local override of focus refetching. Between the
 * two, an open tab re-asks hourly; the HTTP cache then decides whether that ask costs a round-trip
 * (on an ordinary day it does not — Core's max-age is 24h; at the rollover the entry has already
 * contracted to expire at midnight, so it does).
 */
export const enrollmentYearsQuery = () =>
  queryOptions({
    queryKey: queryKeys.enrollmentYears(),
    queryFn: async ({ signal }): Promise<EnrollmentYearRules> =>
      enrollmentYearRulesSchema.parse(
        await apiJson<unknown>("/v1/meta/enrollment-years", { signal }),
      ),
    staleTime: 60 * 60 * 1000,
    // Asking is what staleTime does not do. Background interval left OFF: a hidden tab has no
    // form to validate, and waking it hourly to refresh rules nobody is reading is pure cost.
    refetchInterval: 60 * 60 * 1000,
    refetchIntervalInBackground: false,
    // Local override of the provider's global `false` — returning to a tab is the cheapest
    // moment to notice a year boundary passed while it was hidden.
    refetchOnWindowFocus: true,
  });
