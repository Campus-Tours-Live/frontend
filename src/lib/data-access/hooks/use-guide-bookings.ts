"use client";

import { useQuery } from "@tanstack/react-query";
import { guideBookingsOptions } from "../queries/guide-bookings.query";
import type { GuideBookingFilter } from "../types";

/** List the current guide's bookings for the inbox filter. */
export function useGuideBookings(filter: GuideBookingFilter) {
  return useQuery(guideBookingsOptions(filter));
}
