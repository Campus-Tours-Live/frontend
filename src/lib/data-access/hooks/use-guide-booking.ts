"use client";

import { useQuery } from "@tanstack/react-query";
import { guideBookingOptions } from "../queries/guide-bookings.query";

/** Fetch one guide booking with status history. */
export function useGuideBooking(bookingId: string) {
  return useQuery(guideBookingOptions(bookingId));
}
