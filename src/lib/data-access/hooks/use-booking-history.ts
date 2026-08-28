"use client";

import { useQuery } from "@tanstack/react-query";
import { bookingHistoryOptions } from "../queries/booking-history.query";

/** Fetches the signed-in participant's completed past tours. */
export function useBookingHistory() {
  return useQuery(bookingHistoryOptions());
}
