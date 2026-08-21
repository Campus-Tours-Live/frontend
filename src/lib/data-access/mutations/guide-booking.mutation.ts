import type { QueryClient } from "@tanstack/react-query";
import { postJson } from "../http";
import { queryKeys } from "../keys";
import type { DeclineBookingInput, GuideBooking } from "../types";

function invalidateGuideBookingViews(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["guide-bookings"] });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
}

export const acceptBookingMutation = (qc: QueryClient) => ({
  mutationFn: (bookingId: string) =>
    postJson<GuideBooking>(`/v1/guide/bookings/${bookingId}/accept`, {}),
  onSuccess: () => invalidateGuideBookingViews(qc),
});

export const declineBookingMutation = (qc: QueryClient) => ({
  mutationFn: ({ bookingId, body }: { bookingId: string; body?: DeclineBookingInput }) =>
    postJson<GuideBooking>(`/v1/guide/bookings/${bookingId}/decline`, body ?? {}),
  onSuccess: () => invalidateGuideBookingViews(qc),
});
