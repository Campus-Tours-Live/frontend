"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  duplicateOfferingMutation,
  pauseOfferingMutation,
  retireOfferingMutation,
  updateOfferingMutation,
} from "../mutations/offering-lifecycle.mutation";

export function useUpdateOffering() {
  return useMutation(updateOfferingMutation(useQueryClient()));
}

export function usePauseOffering() {
  return useMutation(pauseOfferingMutation(useQueryClient()));
}

export function useRetireOffering() {
  return useMutation(retireOfferingMutation(useQueryClient()));
}

export function useDuplicateOffering() {
  return useMutation(duplicateOfferingMutation(useQueryClient()));
}
