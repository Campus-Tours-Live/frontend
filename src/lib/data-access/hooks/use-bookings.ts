"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelBookingMutation, createBookingMutation } from "../mutations/booking.mutation";

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation(createBookingMutation(qc));
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation(cancelBookingMutation(qc));
}
