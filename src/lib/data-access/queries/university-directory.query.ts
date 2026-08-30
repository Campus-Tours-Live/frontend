// Client-only query options (via ../http → apiFetch). Not for SSR prefetch — apiFetch is client-only.
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { StateUniversities, UniversityCounts } from "../types";

/**
 * The BROWSABLE directory (GET /v1/universities…), distinct from the onboarding typeahead in
 * `universities.query.ts` (GET /v1/meta/universities?q=). Same population — Core applies one
 * directory boundary to both — but a different shape and a different screen, which is why Core
 * serves them from different resources.
 */

/**
 * Runtime-validated for the same reason the enrolment-year rules are: the point of these endpoints
 * is that the client stops carrying its own copy of the numbers. A malformed payload must fail
 * closed — showing the error state — rather than resolve to something that renders. A column of
 * `undefined` beside 51 state names is worse than a page that admits it could not load.
 */
const countsSchema = z.object({
  // 0 is a legitimate count; negative or fractional is a broken contract.
  byState: z.record(z.string(), z.number().int().nonnegative()),
  total: z.number().int().nonnegative(),
});

const universitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  // Deliberately not `.min(1)`: the directory genuinely has blank cities. It must still be a
  // string, or a row renders "undefined" under the school's name.
  city: z.string(),
});

const stateUniversitiesSchema = z.object({
  state: z.string().length(2),
  universities: z.array(universitySchema),
  total: z.number().int().nonnegative(),
});

/**
 * How long a directory answer stays fresh here — a day, matching Core's own `max-age`.
 *
 * The underlying IPEDS data is published annually, so anything shorter spends round trips
 * re-asking for numbers that have not moved. Unlike the enrolment-year rules there is nothing
 * clock-derived to chase: no part of this payload goes wrong at midnight, so there is deliberately
 * no `refetchInterval` and no focus refetch.
 */
const A_DAY = 24 * 60 * 60 * 1000;

/**
 * GET /v1/universities/state-summary — how many universities each state has.
 *
 * Core answers 503, not a map of zeros, when the directory is unreadable, so an error here really
 * does mean "we do not know" and callers must render it that way. `apiJson` throws on a 503, which
 * is what puts this query into its error state rather than resolving to something plausible.
 */
export const universityCountsQuery = () =>
  queryOptions({
    queryKey: queryKeys.universityCounts(),
    queryFn: async ({ signal }): Promise<UniversityCounts> =>
      countsSchema.parse(
        // `escalate: "none"` — a public directory an anonymous visitor may read, so a 401 here is
        // not a session problem to report (matches the other public reads).
        await apiJson<unknown>("/v1/universities/state-summary", { signal, escalate: "none" }),
      ),
    staleTime: A_DAY,
    // Survive periods with no observer: the summary and a state's list are two views of one
    // directory, so moving between them must not re-fetch what is already known.
    gcTime: A_DAY,
  });

/**
 * GET /v1/universities?state=XX — every university in one state.
 *
 * Keyed BY STATE, which is what makes a state filter feel instant with no code of its own: React
 * Query keeps each state's answer, so returning to one already seen is a cache read. That is the
 * reason this fetches per state rather than pulling all ~1,900 rows up front — the alternative
 * ships the whole country to someone who looks at two states, on a phone.
 */
export const stateUniversitiesQuery = (stateCode: string) =>
  queryOptions({
    queryKey: queryKeys.stateUniversities(stateCode),
    queryFn: async ({ signal }): Promise<StateUniversities> =>
      stateUniversitiesSchema.parse(
        await apiJson<unknown>(`/v1/universities?state=${encodeURIComponent(stateCode)}`, {
          signal,
          escalate: "none",
        }),
      ),
    staleTime: A_DAY,
    gcTime: A_DAY,
    // No state, no request. Core answers a missing or unknown code with a 422, and firing that
    // before the user has chosen anything would be an error state by design.
    enabled: stateCode.length > 0,
  });
