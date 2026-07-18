/**
 * Small shared constants for the availability modals/panels. Deliberately trimmed vs #32's
 * version: no `formatTimeRange`/end-time formatting here — that was end-time-range rendering
 * (Task 4's per-rule bar rendering uses `formatWindow`/`formatDuration` from
 * `lib/availability/duration` instead).
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

/**
 * Full-name day header for an ISO calendar date, e.g. `"Sunday, Jul 26"`. Derived at UTC-noon so it
 * can't slip a tz boundary; presentation only. Shared so the month view, the day-detail sheet, and
 * the date-override editor title all read the same (they used to format it three different ways).
 */
export function formatDayHeader(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}
