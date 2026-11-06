import { queryOptions } from "@tanstack/react-query";
import { apiJson } from "../http";
import { queryKeys } from "../keys";
import type { GuideBooking } from "../types";

/** Real bookings only: the dashboard must not inherit the inbox's local demo fixtures. */
export const guideNextTourOptions = () =>
  queryOptions({
    queryKey: queryKeys.guideNextTour(),
    queryFn: async (): Promise<GuideBooking | null> => {
      const bookings = await apiJson<GuideBooking[]>("/v1/guide/bookings?filter=upcoming");
      const now = Date.now();
      return (
        bookings
          .filter(
            (booking) => booking.status === "CONFIRMED" && Date.parse(booking.scheduledAt) >= now,
          )
          .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0] ?? null
      );
    },
    // Time-based eligibility changes even when no booking mutation occurs.
    staleTime: 0,
    refetchInterval: 30_000,
  });
