"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCartItemMutation,
  checkoutCartMutation,
  removeCartItemMutation,
} from "../mutations/booking.mutation";
import { cartOptions } from "../queries/cart.query";

export function useCart() {
  return useQuery(cartOptions());
}

export function useAddCartItem() {
  const qc = useQueryClient();
  return useMutation(addCartItemMutation(qc));
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation(removeCartItemMutation(qc));
}

export function useCheckoutCart() {
  const qc = useQueryClient();
  return useMutation(checkoutCartMutation(qc));
}
