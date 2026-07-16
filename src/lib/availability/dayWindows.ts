/**
 * Resolve + format a single date's backend-resolved availability windows, shared by the month
 * calendar (`MonthAvailabilityView`) and the desktop "today" detail panel (`TodayAvailabilityPanel`)
 * so the two never drift on the ADDITIONAL/"Extra" flag or the from–to formatting.
 *
 * Like `bucketByDate`, this only reads/labels backend-resolved occurrences — it never computes
 * overlaps, trims, or "net availability" (FE-never-recomputes).
 */

import type { AvailabilityException, AvailabilityOccurrence } from "@/lib/data-access";
import { minutesFromHHmm } from "./fromTo";

/** One backend-resolved window mapped for rendering. `additional` flags a window that matches an
 *  ADDITIONAL exception on the same date (blue "Extra" accent) — never a recomputed one. */
export interface ResolvedDayWindow {
  window: AvailabilityOccurrence;
  additional: boolean;
}

/** Half-open [startMin, endMin) coverage interval in settings-local minutes-of-day. */
export interface MinuteInterval {
  startMin: number;
  endMin: number;
}

/** Minutes-of-day (0–1439) of `iso` AS SEEN in `timeZone` — a rendering coordinate, not
 *  availability math. */
export function localMinutesOfDay(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const hour = Number(map.hour) % 24; // "24" (midnight) → 0
  return hour * 60 + Number(map.minute);
}

export function minutesBetween(startAt: string, endAt: string): number {
  return Math.max(0, (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
}

function formatClockTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Render one window's from–to exactly as returned — 1:1, never merged with a neighbor. */
export function formatWindow(window: AvailabilityOccurrence, timeZone: string): string {
  return `${formatClockTime(window.startAt, timeZone)} – ${formatClockTime(window.endAt, timeZone)}`;
}

/**
 * Per-date ADDITIONAL exception coverage intervals (settings-local minutes-of-day) — used only to
 * flag which resolved windows get the blue "Extra" accent; the occurrences already reflect the net
 * result. Kept as intervals (not raw start times) so the accent survives a backend-TRIMMED ADDITIONAL
 * start: when Core clips an extra window's start (its first minutes were already covered by weekly
 * hours), the resolved window starts LATER than the exception's `startLocal`, so a start-string match
 * would drop the accent — but the start still falls inside the exception's original
 * [start, start+windowMin) interval.
 */
export function buildAdditionalIntervals(
  exceptions: AvailabilityException[] | undefined,
): Map<string, MinuteInterval[]> {
  const map = new Map<string, MinuteInterval[]>();
  for (const exc of exceptions ?? []) {
    if (exc.kind !== "ADDITIONAL") continue;
    const startMin = minutesFromHHmm(exc.startLocal);
    const list = map.get(exc.exceptionDate) ?? [];
    list.push({ startMin, endMin: startMin + exc.windowMin });
    map.set(exc.exceptionDate, list);
  }
  return map;
}

/** Resolve one date's windows (from a settings-tz occurrence bucket) with the "Extra" ADDITIONAL flag. */
export function resolveDayWindows(
  iso: string,
  occurrencesByDate: Map<string, AvailabilityOccurrence[]>,
  additionalIntervals: Map<string, MinuteInterval[]>,
  timeZone: string,
): ResolvedDayWindow[] {
  const raw = occurrencesByDate.get(iso) ?? [];
  const intervals = additionalIntervals.get(iso);
  return raw.map((window) => {
    const startMin = localMinutesOfDay(window.startAt, timeZone);
    const additional =
      intervals?.some((iv) => startMin >= iv.startMin && startMin < iv.endMin) ?? false;
    return { window, additional };
  });
}
