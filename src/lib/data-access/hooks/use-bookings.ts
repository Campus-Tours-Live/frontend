"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBookingMutation } from "../mutations/booking.mutation";

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation(createBookingMutation(qc));
}
