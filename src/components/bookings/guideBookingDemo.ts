import type { GuideBooking } from "@/lib/data-access";
import {
  DEMO_GUIDE_BOOKINGS,
  demoGuideBookingsForFilter,
  getDemoGuideBooking,
  isDemoGuideBookingId,
} from "./guideBookingFixtures";

/** Demo bookings are merged in local dev so the inbox/detail UI is previewable without seed data. */
export function demoGuideBookingsEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function mergeDemoGuideBookings(
  filter: Parameters<typeof demoGuideBookingsForFilter>[0],
  remote: GuideBooking[],
): GuideBooking[] {
  if (!demoGuideBookingsEnabled()) return remote;
  const demos = demoGuideBookingsForFilter(filter);
  const seen = new Set(remote.map((b) => b.id));
  return [...remote, ...demos.filter((b) => !seen.has(b.id))];
}

export function resolveDemoGuideBooking(id: string): GuideBooking | undefined {
  if (!isDemoGuideBookingId(id)) return undefined;
  return getDemoGuideBooking(id);
}

export { DEMO_GUIDE_BOOKINGS, getDemoGuideBooking, isDemoGuideBookingId };
