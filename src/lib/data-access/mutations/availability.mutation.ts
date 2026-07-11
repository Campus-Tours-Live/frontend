import type { QueryClient } from "@tanstack/react-query";
import { deleteJsonRaw, patchJsonRaw, postJsonRaw } from "../http";
import { queryKeys } from "../keys";
import type {
  AvailabilityException,
  AvailabilityRule,
  AvailabilitySettings,
  AvailabilityWriteEnvelope,
  CreateAvailabilityExceptionInput,
  CreateAvailabilityRuleInput,
  UpdateAvailabilityExceptionInput,
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

function invalidateExceptions(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.availabilityExceptions() });
  qc.invalidateQueries({ queryKey: queryKeys.availabilityResolved() });
}

function invalidateSettings(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.availabilitySettings() });
  qc.invalidateQueries({ queryKey: queryKeys.availabilityResolved() });
}

export const createAvailabilityRuleMutation = (qc: QueryClient) => ({
  mutationFn: (body: CreateAvailabilityRuleInput) =>
    postJsonRaw<AvailabilityWriteEnvelope<AvailabilityRule>>("/v1/availability/rules", body),
  onSuccess: () => invalidateRules(qc),
});

export const updateAvailabilityRuleMutation = (qc: QueryClient) => ({
  mutationFn: ({ id, body }: { id: string; body: UpdateAvailabilityRuleInput }) =>
    patchJsonRaw<AvailabilityWriteEnvelope<AvailabilityRule>>(`/v1/availability/rules/${id}`, body),
  onSuccess: () => invalidateRules(qc),
});

/** DELETE returns the remaining Rule[] in `data`. */
export const deleteAvailabilityRuleMutation = (qc: QueryClient) => ({
  mutationFn: (id: string) =>
    deleteJsonRaw<AvailabilityWriteEnvelope<AvailabilityRule[]>>(`/v1/availability/rules/${id}`),
  onSuccess: () => invalidateRules(qc),
});

export const createAvailabilityExceptionMutation = (qc: QueryClient) => ({
  mutationFn: (body: CreateAvailabilityExceptionInput) =>
    postJsonRaw<AvailabilityWriteEnvelope<AvailabilityException>>(
      "/v1/availability/exceptions",
      body,
    ),
  onSuccess: () => invalidateExceptions(qc),
});

export const updateAvailabilityExceptionMutation = (qc: QueryClient) => ({
  mutationFn: ({ id, body }: { id: string; body: UpdateAvailabilityExceptionInput }) =>
    patchJsonRaw<AvailabilityWriteEnvelope<AvailabilityException>>(
      `/v1/availability/exceptions/${id}`,
      body,
    ),
  onSuccess: () => invalidateExceptions(qc),
});

/** DELETE returns the remaining Exception[] in `data`. */
export const deleteAvailabilityExceptionMutation = (qc: QueryClient) => ({
  mutationFn: (id: string) =>
    deleteJsonRaw<AvailabilityWriteEnvelope<AvailabilityException[]>>(
      `/v1/availability/exceptions/${id}`,
    ),
  onSuccess: () => invalidateExceptions(qc),
});

export const updateAvailabilitySettingsMutation = (qc: QueryClient) => ({
  mutationFn: (body: UpdateAvailabilitySettingsInput) =>
    patchJsonRaw<AvailabilityWriteEnvelope<AvailabilitySettings>>(
      "/v1/availability/settings",
      body,
    ),
  onSuccess: () => invalidateSettings(qc),
});
