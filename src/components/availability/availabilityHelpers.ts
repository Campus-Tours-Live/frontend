/**
 * Small shared constants for the availability modals. Deliberately trimmed vs #32's version:
 * no `formatTimeRange`/end-time formatting here — that was end-time-range rendering (Task 4's
 * per-rule bar rendering picks its own start+duration display, e.g. `formatDuration`).
 */

/** 0=Sunday … 6=Saturday (matches Core schema / BFF `dayOfWeek`). */
export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export { todayIsoDate } from "@/lib/availability/formatDate";
