import type { QueryClient } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { BookingResponse, CreateBookingInput } from "../types";

function invalidateBookingSurfaces(qc: QueryClient, offeringIds: Array<string | null | undefined>) {
  qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
  qc.invalidateQueries({ queryKey: queryKeys.cart() });
  for (const offeringId of new Set(offeringIds.filter(Boolean))) {
    qc.invalidateQueries({ queryKey: queryKeys.offeringSlots(offeringId as string) });
  }
}

function idempotencyKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function jsonWriteInit(method: "DELETE" | "POST", body?: unknown): RequestInit {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey(),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export const createBookingMutation = (qc: QueryClient) => ({
  mutationFn: (body: CreateBookingInput) =>
    apiJson<BookingResponse>("/v1/bookings", jsonWriteInit("POST", body)),
  onSuccess: (booking: BookingResponse, variables: CreateBookingInput) => {
    invalidateBookingSurfaces(qc, [variables.tourOfferingId, booking.tourOfferingId]);
  },
});

export const addCartItemMutation = (qc: QueryClient) => ({
  mutationFn: (body: CreateBookingInput) =>
    apiJson<BookingResponse>("/v1/cart/items", jsonWriteInit("POST", body)),
  onSuccess: (booking: BookingResponse, variables: CreateBookingInput) => {
    invalidateBookingSurfaces(qc, [variables.tourOfferingId, booking.tourOfferingId]);
  },
});
