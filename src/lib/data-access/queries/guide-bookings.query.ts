import { queryOptions } from "@tanstack/react-query";
import {
  mergeDemoGuideBookings,
  resolveDemoGuideBooking,
} from "@/components/bookings/guideBookingDemo";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { GuideBooking, GuideBookingFilter } from "../types";

/** GET /v1/guide/bookings?filter= — the signed-in guide's booking inbox. */
export const guideBookingsOptions = (filter: GuideBookingFilter) =>
  queryOptions({
    queryKey: queryKeys.guideBookings(filter),
    queryFn: async () => {
      const remote = await apiJson<GuideBooking[]>(
        `/v1/guide/bookings?filter=${encodeURIComponent(filter)}`,
      );
      return mergeDemoGuideBookings(filter, remote);
    },
  });

/** GET /v1/guide/bookings/{id} — one booking with status history. */
export const guideBookingOptions = (bookingId: string) =>
  queryOptions({
    queryKey: queryKeys.guideBooking(bookingId),
    queryFn: async () => {
      const demo = resolveDemoGuideBooking(bookingId);
      if (demo) return demo;
      return apiJson<GuideBooking>(`/v1/guide/bookings/${encodeURIComponent(bookingId)}`);
    },
  });
