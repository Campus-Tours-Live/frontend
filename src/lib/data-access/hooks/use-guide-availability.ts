"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAvailabilityExceptionMutation,
  createAvailabilityRuleMutation,
  deleteAvailabilityExceptionMutation,
  deleteAvailabilityRuleMutation,
  updateAvailabilityExceptionMutation,
  updateAvailabilityRuleMutation,
  updateAvailabilitySettingsMutation,
} from "../mutations/availability.mutation";
import { availabilityExceptionsOptions } from "../queries/availability-exceptions.query";
import { availabilityRulesOptions } from "../queries/availability-rules.query";
import { availabilitySettingsOptions } from "../queries/availability-settings.query";
import { offeringSlotsOptions } from "../queries/offering-slots.query";
import { overridePreviewOptions } from "../queries/override-preview.query";
import { resolvedAvailabilityOptions } from "../queries/resolved-availability.query";
import type { OverridePreviewParams } from "../types";

/** List the guide's recurring start+duration availability rules. */
export function useAvailabilityRules() {
  return useQuery(availabilityRulesOptions());
}

/** Create a rule: `{ dayOfWeek, startLocal, windowMin, ... }` — no end time, server sets tz. */
export function useCreateAvailabilityRule() {
  const qc = useQueryClient();
  return useMutation(createAvailabilityRuleMutation(qc));
}

export function useUpdateAvailabilityRule() {
  const qc = useQueryClient();
  return useMutation(updateAvailabilityRuleMutation(qc));
}

/** Delete a rule; the mutation resolves with the remaining rule list in `data`. */
export function useDeleteAvailabilityRule() {
  const qc = useQueryClient();
  return useMutation(deleteAvailabilityRuleMutation(qc));
}

/** List one-off exceptions (UNAVAILABLE / ADDITIONAL) to the weekly rules. */
export function useAvailabilityExceptions() {
  return useQuery(availabilityExceptionsOptions());
}

export function useCreateAvailabilityException() {
  const qc = useQueryClient();
  return useMutation(createAvailabilityExceptionMutation(qc));
}

export function useUpdateAvailabilityException() {
  const qc = useQueryClient();
  return useMutation(updateAvailabilityExceptionMutation(qc));
}

/** Delete an exception; the mutation resolves with the remaining exception list in `data`. */
export function useDeleteAvailabilityException() {
  const qc = useQueryClient();
  return useMutation(deleteAvailabilityExceptionMutation(qc));
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
 * Date-specific override dry-run (Block/Add-extra) — `GET /v1/availability/preview`. Disabled
 * (no fetch) when `params` is null, e.g. the override modal's form isn't filled in yet. Read-only:
 * the FE renders the returned before/after windows + trimmed entries, never recomputing them.
 */
export function useOverridePreview(params: OverridePreviewParams | null) {
  return useQuery(overridePreviewOptions(params));
}
