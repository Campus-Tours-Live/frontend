import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { GuideBooking, GuideBookingFilter } from "../types";

/** GET /v1/guide/bookings?filter= — the signed-in guide's booking inbox. */
export const guideBookingsOptions = (filter: GuideBookingFilter) =>
  queryOptions({
    queryKey: queryKeys.guideBookings(filter),
    queryFn: () =>
      apiJson<GuideBooking[]>(`/v1/guide/bookings?filter=${encodeURIComponent(filter)}`),
  });

/** GET /v1/guide/bookings/{id} — one booking with status history. */
export const guideBookingOptions = (bookingId: string) =>
  queryOptions({
    queryKey: queryKeys.guideBooking(bookingId),
    queryFn: () => apiJson<GuideBooking>(`/v1/guide/bookings/${encodeURIComponent(bookingId)}`),
  });
