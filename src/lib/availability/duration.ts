/**
 * Duration (availability WINDOW length) helpers — CTL-55 start+duration model.
 *
 * `windowMin` is a plain positive integer number of minutes measured from `startLocal`. There is
 * **no** end-of-day / 24:00 sentinel, no wraparound, and no snap-to-grid: a rule/exception that
 * starts at 22:00 with a 4h window simply carries `windowMin: 240` and may cross midnight — the
 * backend (materialized occurrences) is responsible for resolving that against calendar days, not
 * the form.
 *
 * NOTE: this is the availability WINDOW (how long the guide is bookable for), not
 * `durationsOffered` (the tour lengths a guide sells). Label UI copy accordingly.
 */

/** A positive-integer minute count — no 24:00 sentinel, no wraparound. */
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
