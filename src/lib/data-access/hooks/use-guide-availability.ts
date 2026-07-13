"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  replaceOverridesMutation,
  replaceRulesMutation,
  updateAvailabilityExceptionMutation,
  updateAvailabilityRuleMutation,
  updateAvailabilitySettingsMutation,
} from "../mutations/availability.mutation";
import { availabilityExceptionsOptions } from "../queries/availability-exceptions.query";
import { availabilityRulesOptions } from "../queries/availability-rules.query";
import { availabilitySettingsOptions } from "../queries/availability-settings.query";
import { offeringSlotsOptions } from "../queries/offering-slots.query";
import { overrideMultiPreviewOptions } from "../queries/override-multi-preview.query";
import { resolvedAvailabilityOptions } from "../queries/resolved-availability.query";
import type { OverrideMultiPreviewParams } from "../types";

/** List the guide's recurring start+duration availability rules. */
export function useAvailabilityRules() {
  return useQuery(availabilityRulesOptions());
}

export function useUpdateAvailabilityRule() {
  const qc = useQueryClient();
  return useMutation(updateAvailabilityRuleMutation(qc));
}

/** List one-off exceptions (UNAVAILABLE / ADDITIONAL) to the weekly rules. */
export function useAvailabilityExceptions() {
  return useQuery(availabilityExceptionsOptions());
}

export function useUpdateAvailabilityException() {
  const qc = useQueryClient();
  return useMutation(updateAvailabilityExceptionMutation(qc));
}

/**
 * Atomic single-day replace of one kind's date-specific overrides — `POST
 * /v1/availability/overrides/replace` (CTL-55 v2.1 B2). Sends `{date, kind, windows}` as-is; the
 * backend transaction is the only source of atomicity (the FE never reconciles by
 * delete-then-create). Invalidates rules, exceptions, and the resolved read on success.
 */
export function useReplaceOverrides() {
  const qc = useQueryClient();
  return useMutation(replaceOverridesMutation(qc));
}

/**
 * Atomic replace of one weekday's recurring rules — `POST /v1/availability/rules/replace`
 * (CTL-55 v2.1 B2). Sends `{dayOfWeek, windows}` as-is; the backend transaction is the only
 * source of atomicity (the FE never reconciles by create/update/delete). Invalidates rules,
 * exceptions, and the resolved read on success.
 */
export function useReplaceRules() {
  const qc = useQueryClient();
  return useMutation(replaceRulesMutation(qc));
}

/** The guide's booking policy (acceptance mode, buffers, durations offered, timezone). */
export function useAvailabilitySettings() {
  return useQuery(availabilitySettingsOptions());
}

export function useUpdateAvailabilitySettings() {
  const qc = useQueryClient();
  return useMutation(updateAvailabilitySettingsMutation(qc));
}

/**
 * The backend-resolved (coalesced) availability: `{ rules, occurrences, dstGapDays }`. Read-only —
 * used for the "actual availability" preview and the DST notice; never re-coalesced on the client.
 */
export function useResolvedAvailability() {
  return useQuery(resolvedAvailabilityOptions());
}

/** Participant-facing bookable slots for an offering. */
export function useOfferingSlots(offeringId: string, options?: { enabled?: boolean }) {
  return useQuery(offeringSlotsOptions(offeringId, options?.enabled ?? Boolean(offeringId)));
}

/**
 * Multi-slot date-specific override dry-run — `POST /v1/availability/preview`. Given N proposed
 * `windows`, returns the NET result of all of them applied together (one combined
 * {@link OverridePreviewResponse}). Disabled (no fetch) when `params` is null or has no windows,
 * e.g. the override modal has no structurally-valid slot yet. Read-only: the FE renders the
 * returned before/after windows + trimmed entries, never recomputing or merging them.
 */
export function useOverrideMultiPreview(params: OverrideMultiPreviewParams | null) {
  return useQuery(overrideMultiPreviewOptions(params));
}
