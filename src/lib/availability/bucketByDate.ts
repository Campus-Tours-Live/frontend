/**
 * Settings-tz date bucketing for backend-resolved availability occurrences (CTL-55 v2.1).
 *
 * Extracted from `MonthAvailabilityView.tsx` (Task 3) so the date-specific override modal
 * (Task 4) can render the SAME "current windows for a date, in settings tz" logic for its
 * "before" side, instead of a second tz-bucketing implementation (a known regression risk —
 * two independently-written `Intl.DateTimeFormat` bucketers drifting apart on DST/boundary
 * edge cases).
 *
 * This module only buckets/labels backend-resolved occurrences by calendar date as seen in a
 * given IANA timezone — it never computes overlaps, trims, or "net availability"; that stays
 * entirely a backend concern (FE-never-recomputes).
 */

import type { AvailabilityOccurrence } from "@/lib/data-access";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Extract {year, month, day} for `date` AS SEEN in `timeZone` — the only tz-aware calendar-date
 *  computation in this module (bucketing/"today", never net-availability math). */
export function partsInTimeZone(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

/** The ISO (yyyy-mm-dd) calendar date `date` falls on, AS SEEN in `timeZone`. An occurrence's
 *  UTC instant can land on a different calendar date than its settings-tz date near a tz
 *  boundary (e.g. a late-UTC-evening instant in a negative-offset zone lands on the PREVIOUS
 *  settings-tz date) — this always resolves to the settings-tz date, never the UTC/runner-local
 *  one. */
export function isoDateInTimeZone(date: Date, timeZone: string): string {
  const { year, month, day } = partsInTimeZone(date, timeZone);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Bucket resolved occurrences by settings-tz calendar date. Because weekly rules are same-day
 * (option A), each occurrence belongs to exactly one settings-tz date — this is a straight
 * grouping, never a merge/coalesce of the occurrences themselves (FE-never-recomputes).
 */
export function bucketOccurrencesByDate(
  occurrences: AvailabilityOccurrence[],
  timeZone: string,
): Map<string, AvailabilityOccurrence[]> {
  const map = new Map<string, AvailabilityOccurrence[]>();
  for (const occurrence of occurrences) {
    const iso = isoDateInTimeZone(new Date(occurrence.startAt), timeZone);
    const list = map.get(iso) ?? [];
    list.push(occurrence);
    map.set(iso, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.startAt.localeCompare(b.startAt));
  }
  return map;
}
