import type { QueryClient } from "@tanstack/react-query";
import { sanitizeRuleTimes } from "@/lib/availability/timeOptions";
import { deleteJson, patchJson, postJson } from "../http";
import { queryKeys } from "../keys";
import type {
  AvailabilityException,
  AvailabilityRule,
  BookingSettings,
  CreateAvailabilityExceptionInput,
  CreateAvailabilityRuleInput,
  UpdateAvailabilityExceptionInput,
  UpdateAvailabilityRuleInput,
  UpdateBookingSettingsInput,
} from "../types";

function invalidateAvailability(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.guideAvailability() });
}

function withSanitizedRuleTimes<T extends { startLocal?: string; endLocal?: string }>(body: T): T {
  if (body.startLocal == null || body.endLocal == null) return body;
  const { startLocal, endLocal } = sanitizeRuleTimes(body.startLocal, body.endLocal);
  return { ...body, startLocal, endLocal };
}

export const createAvailabilityRuleMutation = (qc: QueryClient) => ({
  mutationFn: (body: CreateAvailabilityRuleInput) =>
    postJson<AvailabilityRule>("/v1/guide/availability/rules", withSanitizedRuleTimes(body)),
  onSuccess: () => invalidateAvailability(qc),
});

export const updateAvailabilityRuleMutation = (qc: QueryClient) => ({
  mutationFn: ({ id, body }: { id: string; body: UpdateAvailabilityRuleInput }) =>
    patchJson<AvailabilityRule>(`/v1/guide/availability/rules/${id}`, withSanitizedRuleTimes(body)),
  onSuccess: () => invalidateAvailability(qc),
});

export const deleteAvailabilityRuleMutation = (qc: QueryClient) => ({
  mutationFn: (id: string) => deleteJson(`/v1/guide/availability/rules/${id}`),
  onSuccess: () => invalidateAvailability(qc),
});

export const createAvailabilityExceptionMutation = (qc: QueryClient) => ({
  mutationFn: (body: CreateAvailabilityExceptionInput) =>
    postJson<AvailabilityException>("/v1/guide/availability/exceptions", body),
  onSuccess: () => invalidateAvailability(qc),
});

export const updateAvailabilityExceptionMutation = (qc: QueryClient) => ({
  mutationFn: ({ id, body }: { id: string; body: UpdateAvailabilityExceptionInput }) =>
    patchJson<AvailabilityException>(`/v1/guide/availability/exceptions/${id}`, body),
  onSuccess: () => invalidateAvailability(qc),
});

export const deleteAvailabilityExceptionMutation = (qc: QueryClient) => ({
  mutationFn: (id: string) => deleteJson(`/v1/guide/availability/exceptions/${id}`),
  onSuccess: () => invalidateAvailability(qc),
});

export const updateBookingSettingsMutation = (qc: QueryClient) => ({
  mutationFn: (body: UpdateBookingSettingsInput) =>
    patchJson<BookingSettings>("/v1/guide/availability/booking-settings", body),
  onSuccess: () => invalidateAvailability(qc),
});
