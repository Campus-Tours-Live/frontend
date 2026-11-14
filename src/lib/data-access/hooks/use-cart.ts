"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addCartItemMutation } from "../mutations/booking.mutation";

export function useAddCartItem() {
  const qc = useQueryClient();
  return useMutation(addCartItemMutation(qc));
}
