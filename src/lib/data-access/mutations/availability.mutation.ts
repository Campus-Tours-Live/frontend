import type { QueryClient } from "@tanstack/react-query";
import { patchJsonRaw, postJsonRaw } from "../http";
import { queryKeys } from "../keys";
import type {
  AvailabilityException,
  AvailabilityRule,
  AvailabilitySettings,
  AvailabilityWriteEnvelope,
  OverrideReplaceInput,
  RulesReplaceInput,
  UpdateAvailabilityRuleInput,
  UpdateAvailabilitySettingsInput,
} from "../types";

/**
 * Availability writes (rules/exceptions/settings) all return a **write envelope**
 * `{ data, affectedBookings, meta }` (CTL-56/BFF Contract A) — `data` is the mutated resource (or,
 * for DELETE, the remaining list), and `affectedBookings` lists any bookings the change affects.
 * Rules/exceptions changes also invalidate the resolved read (`GET /v1/availability`) since it's
 * derived from them.
 */

function invalidateRules(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.availabilityRules() });
  qc.invalidateQueries({ queryKey: queryKeys.availabilityResolved() });
}

function invalidateSettings(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.availabilitySettings() });
  qc.invalidateQueries({ queryKey: queryKeys.availabilityResolved() });
}

/**
 * The atomic replace endpoints (CTL-55 v2.1 B2) touch a single day's overrides or a single
 * weekday's rules, but the calendar view renders rules + exceptions + the resolved read
 * together — invalidate all three so every consumer re-fetches, not just the resource the
 * replace directly wrote.
 */
function invalidateRulesAndExceptions(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.availabilityRules() });
  qc.invalidateQueries({ queryKey: queryKeys.availabilityExceptions() });
  qc.invalidateQueries({ queryKey: queryKeys.availabilityResolved() });
}

export const updateAvailabilityRuleMutation = (qc: QueryClient) => ({
  mutationFn: ({ id, body }: { id: string; body: UpdateAvailabilityRuleInput }) =>
    patchJsonRaw<AvailabilityWriteEnvelope<AvailabilityRule>>(`/v1/availability/rules/${id}`, body),
  onSuccess: () => invalidateRules(qc),
});

/**
 * Atomic single-day replace of one kind's date-specific overrides (`POST
 * /v1/availability/overrides/replace`, CTL-55 v2.1 B2) — the backend transaction is the only
 * source of atomicity; the FE sends the raw `{date, kind, windows}` and never reconciles by
 * delete-then-create. Resolves with the day's remaining same-kind exceptions in `data`.
 */
export const replaceOverridesMutation = (qc: QueryClient) => ({
  mutationFn: (body: OverrideReplaceInput) =>
    postJsonRaw<AvailabilityWriteEnvelope<AvailabilityException[]>>(
      "/v1/availability/overrides/replace",
      body,
    ),
  onSuccess: () => invalidateRulesAndExceptions(qc),
});

/**
 * Atomic replace of one weekday's recurring rules (`POST /v1/availability/rules/replace`,
 * CTL-55 v2.1 B2) — the backend transaction is the only source of atomicity; the FE sends the
 * raw `{dayOfWeek, windows}` and never reconciles by create/update/delete. Resolves with the
 * weekday's remaining rules in `data`.
 */
export const replaceRulesMutation = (qc: QueryClient) => ({
  mutationFn: (body: RulesReplaceInput) =>
    postJsonRaw<AvailabilityWriteEnvelope<AvailabilityRule[]>>(
      "/v1/availability/rules/replace",
      body,
    ),
  onSuccess: () => invalidateRulesAndExceptions(qc),
});

export const updateAvailabilitySettingsMutation = (qc: QueryClient) => ({
  mutationFn: (body: UpdateAvailabilitySettingsInput) =>
    patchJsonRaw<AvailabilityWriteEnvelope<AvailabilitySettings>>(
      "/v1/availability/settings",
      body,
    ),
  onSuccess: () => invalidateSettings(qc),
});
