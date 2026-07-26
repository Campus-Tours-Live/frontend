/**
 * Duration (availability WINDOW length) helpers — CTL-55 start+duration model.
 *
 * `windowMin` is a plain positive integer number of minutes measured from `startLocal`: no
 * sentinel value, no wraparound encoding, no snap-to-grid. This module validates that number and
 * nothing else.
 *
 * It does NOT follow that a window may cross midnight — it may not. Ranges are same-day only, and
 * `fromTo.ts` enforces it: `toWindowMin` throws on a range that would pass midnight, and the
 * pickers offer `"24:00"` as the end-of-day option (`startLocal + windowMin === 1440`).
 * Cross-midnight availability is expressed as two adjacent-day rows. So a 22:00 start with a 4h
 * window is not a legal range here, even though 240 is a legal `windowMin`.
 *
 * NOTE: this is the availability WINDOW (how long the guide is bookable for), not
 * `durationsOffered` (the tour lengths a guide sells). Label UI copy accordingly.
 */

/** A positive-integer minute count. Whether it fits the day is `fromTo.ts`'s business. */
export function isValidWindowMin(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0
  );
}

/** Format minutes for display, e.g. `240` → `"4h"`, `90` → `"1h 30m"`, `45` → `"45m"`. */
export function formatDuration(windowMin: number): string {
  if (!isValidWindowMin(windowMin)) return "";
  const hours = Math.floor(windowMin / 60);
  const minutes = windowMin % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Render a plain `"HH:mm"` as a 12-hour clock time, e.g. `"22:00"` → `"10:00 PM"`. Falls back
 *  to the raw value when it doesn't parse. */
function formatStartLocal(startLocal: string): string {
  const [hourStr, minuteStr] = startLocal.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return startLocal;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  const mins = String(minute).padStart(2, "0");
  return `${hour12}:${mins} ${period}`;
}

/**
 * Format a rule/exception's start + window length for a per-rule/per-exception bar, e.g.
 * `formatWindow("10:00", 240)` → `"10:00 AM · 4h"`. Combines {@link formatStartLocal} (a plain
 * 12-hour clock render of `startLocal`, no timezone conversion — it's already local) with
 * {@link formatDuration}.
 */
export function formatWindow(startLocal: string, windowMin: number): string {
  return `${formatStartLocal(startLocal)} · ${formatDuration(windowMin)}`;
}
