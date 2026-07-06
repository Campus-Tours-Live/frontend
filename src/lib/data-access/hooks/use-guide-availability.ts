"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAvailabilityExceptionMutation,
  createAvailabilityRuleMutation,
  deleteAvailabilityExceptionMutation,
  deleteAvailabilityRuleMutation,
  updateAvailabilityExceptionMutation,
  updateAvailabilityRuleMutation,
  updateBookingSettingsMutation,
} from "../mutations/availability.mutation";
import { guideAvailabilityOptions } from "../queries/availability.query";

export function useGuideAvailability() {
  return useQuery(guideAvailabilityOptions());
}

export function useCreateAvailabilityRule() {
  const qc = useQueryClient();
  return useMutation(createAvailabilityRuleMutation(qc));
}

export function useUpdateAvailabilityRule() {
  const qc = useQueryClient();
  return useMutation(updateAvailabilityRuleMutation(qc));
}

export function useDeleteAvailabilityRule() {
  const qc = useQueryClient();
  return useMutation(deleteAvailabilityRuleMutation(qc));
}

export function useCreateAvailabilityException() {
  const qc = useQueryClient();
  return useMutation(createAvailabilityExceptionMutation(qc));
}

export function useUpdateAvailabilityException() {
  const qc = useQueryClient();
  return useMutation(updateAvailabilityExceptionMutation(qc));
}

export function useDeleteAvailabilityException() {
  const qc = useQueryClient();
  return useMutation(deleteAvailabilityExceptionMutation(qc));
}

export function useUpdateBookingSettings() {
  const qc = useQueryClient();
  return useMutation(updateBookingSettingsMutation(qc));
}
