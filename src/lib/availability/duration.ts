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

export const CUSTOM_DURATION_VALUE = "custom";

export interface DurationPreset {
  /** Stable id used as the <option> value. */
  value: string;
  label: string;
  minutes: number;
}

/** A reasonable spread of common availability-window lengths. */
export const DURATION_PRESETS: DurationPreset[] = [
  { value: "30", label: "30 minutes", minutes: 30 },
  { value: "60", label: "1 hour", minutes: 60 },
  { value: "90", label: "1 hour 30 min", minutes: 90 },
  { value: "120", label: "2 hours", minutes: 120 },
  { value: "180", label: "3 hours", minutes: 180 },
  { value: "240", label: "4 hours", minutes: 240 },
  { value: "360", label: "6 hours", minutes: 360 },
  { value: "480", label: "8 hours", minutes: 480 },
];

/** A positive-integer minute count — no 24:00 sentinel, no wraparound. */
export function isValidWindowMin(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0
  );
}

/** Map a stored `windowMin` to the matching preset's `value`, or `"custom"` when it isn't one. */
export function minutesToPresetValue(windowMin: number): string {
  const preset = DURATION_PRESETS.find((option) => option.minutes === windowMin);
  return preset ? preset.value : CUSTOM_DURATION_VALUE;
}

/**
 * Map a picker selection back to `windowMin`. For `"custom"`, `customMinutes` (raw string from a
 * number input) is parsed; returns `null` when the selection doesn't resolve to a valid positive
 * integer number of minutes (caller should surface a validation error, never silently coerce).
 */
export function presetValueToMinutes(
  value: string,
  customMinutes?: string | number | null,
): number | null {
  if (value === CUSTOM_DURATION_VALUE) {
    const parsed = typeof customMinutes === "number" ? customMinutes : Number(customMinutes ?? "");
    return isValidWindowMin(parsed) ? parsed : null;
  }
  const preset = DURATION_PRESETS.find((option) => option.value === value);
  return preset ? preset.minutes : null;
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
