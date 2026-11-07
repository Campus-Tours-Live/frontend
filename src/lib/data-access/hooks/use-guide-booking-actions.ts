"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { acceptBookingMutation, declineBookingMutation } from "../mutations/guide-booking.mutation";

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
