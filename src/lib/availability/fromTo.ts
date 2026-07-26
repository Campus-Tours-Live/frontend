/**
 * from–to (start/end clock-time) helpers for the CTL-55 v2.1 weekly + date-specific override
 * pickers — availability WINDOW display only.
 *
 * Storage stays start+duration (`startLocal` + `windowMin`, see `./duration.ts`); the UI presents
 * a "from–to" range instead. **Same-day only (option A):** a single range cannot cross midnight.
 * `to` may be the sentinel `"24:00"` (midnight/end-of-day, i.e. `startLocal + windowMin === 1440`)
 * — never `"00:00"`, which would ambiguously read as the start of the *same* day. Both
 * `DayHoursModal` (weekly) and `DateOverrideModal` (date-specific) must offer `"24:00"` as the
 * `to` picker's midnight option so a guide can reach end-of-day; cross-midnight availability is
 * expressed as two adjacent-day rows/overrides instead.
 *
 * This module only validates/formats a single from–to range for the picker — it never computes
 * overlaps, trims, or "net availability"; that is entirely a backend concern (FE-never-recomputes).
 */

/** Plain "HH:mm" clock time, hour 0-23 and minute 0-59 (no seconds, no "24:00" — callers that
 *  accept the midnight sentinel check for it before calling this). */
const HHMM_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** Parse a plain "HH:mm" clock time into minutes-from-midnight. Does not special-case "24:00" —
 *  callers that accept the midnight sentinel check for it before calling this. **Throws** on a
 *  malformed or out-of-range value (T1 review Minor) instead of the old `Number(...)` coercion,
 *  which silently produced `NaN` for e.g. `"ab:cd"` — a `NaN` `windowMin` slipped past both
 *  `toWindowMin` guards below (`NaN <= x` and `x + NaN > 1440` are both `false`) and was returned
 *  as-is to the caller. */
function parseHHmm(value: string): number {
  const match = HHMM_PATTERN.exec(value);
  if (!match) {
    throw new Error(`invalid "HH:mm" time: "${value}"`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Convert a from–to pair of "HH:mm" clock times into `windowMin` (minutes elapsed since `from`).
 *
 * `to` may be `"24:00"` (the midnight/end-of-day sentinel). Throws when:
 * - `to` is not strictly after `from` as a plain clock value (unless `to === "24:00"`), or
 * - the implied window would still cross midnight (`from-minutes + windowMin > 1440`) —
 *   this model is same-day only (option A); a cross-midnight range must be split into two
 *   adjacent-day rows/overrides instead.
 */
export function toWindowMin(from: string, to: string): number {
  const fromMin = parseHHmm(from);
  const toMin = to === "24:00" ? 1440 : parseHHmm(to);

  if (to !== "24:00" && toMin <= fromMin) {
    throw new Error(`"to" (${to}) must be after "from" (${from})`);
  }

  const windowMin = toMin - fromMin;
  /* istanbul ignore next -- defensive: fromMin+windowMin === toMin, already ≤ 1440 by HHMM regex/sentinel */
  if (fromMin + windowMin > 1440) {
    throw new Error(`a same-day range cannot cross midnight (from "${from}" for ${windowMin}min)`);
  }
  return windowMin;
}

/** Format total minutes-from-midnight as a 12-hour clock label, e.g. `540` → `"9:00 AM"`,
 *  `780` → `"1:00 PM"`. Special-cases exactly `1440` (midnight/end-of-day) as `"12:00 AM"`
 *  since that's past the normal 0–1439 range a plain clock time covers. */
function formatClock12(totalMinutes: number): string {
  if (totalMinutes === 1440) return "12:00 AM";
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

/** Parse a plain "HH:mm" clock time into minutes-from-midnight — the shared parser behind the
 *  `to`-picker grid (hoisted out of `DayHoursModal`/`DateOverrideModal`, which each had a
 *  byte-identical, unvalidated copy of this). Unlike the internal
 *  {@link parseHHmm} this module's other exports use, callers here only ever pass grid-generated
 *  values, so a simple split/Number is enough. */
export function minutesFromHHmm(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

/**
 * Compute the display label for the end ("to") of a start+duration window, e.g.
 * `windowToTo("09:00", 240)` → `"1:00 PM"`. Returns the `"12:00 AM"` label when
 * `startLocal + windowMin === 1440` (midnight/end-of-day) — the same edge case `toWindowMin`
 * accepts via the `"24:00"` sentinel.
 */
export function windowToTo(startLocal: string, windowMin: number): string {
  return formatClock12(parseHHmm(startLocal) + windowMin);
}

/**
 * Compute the RAW `"HH:mm"` value for the end ("to") of a start+duration window — for a
 * controlled `to`-picker's *value*, as opposed to {@link windowToTo}'s 12-hour *display label*
 * (e.g. `"1:00 PM"`), which cannot round-trip back through {@link toWindowMin}. Returns exactly
 * `"24:00"` (never `"00:00"`) when `startLocal + windowMin === 1440` (midnight/end-of-day), same
 * sentinel `toWindowMin` accepts. `windowToRawTo("09:00", 240)` → `"13:00"`;
 * `windowToRawTo("22:00", 120)` → `"24:00"`.
 */
export function windowToRawTo(startLocal: string, windowMin: number): string {
  const totalMinutes = parseHHmm(startLocal) + windowMin;
  if (totalMinutes === 1440) return "24:00";
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Format a start+duration window as a from–to range for display, e.g.
 * `formatFromTo("09:00", 240)` → `"9:00 AM – 1:00 PM"`;
 * `formatFromTo("22:00", 120)` → `"10:00 PM – 12:00 AM"` (ends exactly at midnight).
 */
export function formatFromTo(startLocal: string, windowMin: number): string {
  const fromLabel = formatClock12(parseHHmm(startLocal));
  const toLabel = windowToTo(startLocal, windowMin);
  return `${fromLabel} – ${toLabel}`;
}
