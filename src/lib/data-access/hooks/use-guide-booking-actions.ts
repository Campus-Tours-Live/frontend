"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  acceptBookingMutation,
  completeBookingMutation,
  declineBookingMutation,
  markNoShowBookingMutation,
} from "../mutations/guide-booking.mutation";

/** Accept a pending booking request. */
export function useAcceptBooking() {
  const qc = useQueryClient();
  return useMutation(acceptBookingMutation(qc));
}

/** Decline a pending booking request (optional reason). */
export function useDeclineBooking() {
  const qc = useQueryClient();
  return useMutation(declineBookingMutation(qc));
}

/** Mark a started confirmed tour as completed. */
export function useCompleteBooking() {
  const qc = useQueryClient();
  return useMutation(completeBookingMutation(qc));
}

/** Mark a started confirmed tour as participant no-show (optional reason). */
export function useMarkNoShowBooking() {
  const qc = useQueryClient();
  return useMutation(markNoShowBookingMutation(qc));
}
