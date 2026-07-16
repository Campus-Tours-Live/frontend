"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, Body, Caption, Heading, IconButton, Panel } from "@/components/ui";
import {
  useAvailabilityExceptions,
  useAvailabilitySettings,
  useResolvedAvailability,
} from "@/lib/data-access";
import { bucketOccurrencesByDate, isoDateInTimeZone } from "@/lib/availability/bucketByDate";
import {
  buildAdditionalIntervals,
  formatWindow,
  resolveDayWindows,
} from "@/lib/availability/dayWindows";
import { cn } from "@/lib/utils";
import { formatDayHeader } from "./availabilityHelpers";

const FALLBACK_TIMEZONE = "America/Los_Angeles";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Shift an ISO date by whole days in UTC — pure calendar arithmetic (no clock time), so it's
 *  tz-independent. */
function addDays(iso: string, delta: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day + delta));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** Sun=0 … Sat=6 for an ISO date (UTC calendar arithmetic). */
function weekdayOf(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Desktop-only week detail panel shown under the month calendar (CTL-55 v2.1). Browses the current
 * week (Sun–Sat, the week containing today) one day at a time via the chevrons, defaulting to today.
 * Each day is a read-only summary of that date's backend-resolved windows, rendered 1:1 with the
 * same "Extra" accent as the calendar via the shared `dayWindows` helper (FE-never-recomputes).
 * Grouped with `MonthAvailabilityView` into the page's right column and grows to fill, so that column
 * tracks the height of the left weekly-hours rail.
 */
export function WeekAvailabilityPanel({ className }: { className?: string }) {
  const resolvedQuery = useResolvedAvailability();
  const settingsQuery = useAvailabilitySettings();
  const exceptionsQuery = useAvailabilityExceptions();
  const timeZone = settingsQuery.data?.timezone ?? FALLBACK_TIMEZONE;

  const todayIso = useMemo(() => isoDateInTimeZone(new Date(), timeZone), [timeZone]);
  // The current week (Sun–Sat) that contains today — day navigation is bounded to it.
  const weekStart = useMemo(() => addDays(todayIso, -weekdayOf(todayIso)), [todayIso]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  // `null` follows today (the default); a chevron tap pins an absolute date within the week.
  const [picked, setPicked] = useState<string | null>(null);
  const selectedDate = picked ?? todayIso;
  const atWeekStart = selectedDate <= weekStart;
  const atWeekEnd = selectedDate >= weekEnd;

  const occurrencesByDate = useMemo(
    () => bucketOccurrencesByDate(resolvedQuery.data?.occurrences ?? [], timeZone),
    [resolvedQuery.data?.occurrences, timeZone],
  );
  const additionalIntervals = useMemo(
    () => buildAdditionalIntervals(exceptionsQuery.data),
    [exceptionsQuery.data],
  );
  const windows = useMemo(
    () => resolveDayWindows(selectedDate, occurrencesByDate, additionalIntervals, timeZone),
    [selectedDate, occurrencesByDate, additionalIntervals, timeZone],
  );

  return (
    <Panel
      role="region"
      aria-label="Availability by day"
      divider="inset"
      className={cn("flex flex-col", className)}
      header={
        <div className="flex items-center justify-between gap-2 px-5 py-4 sm:px-6">
          <IconButton
            a11yLabel="Previous day"
            variant="soft"
            disabled={atWeekStart}
            onClick={() => setPicked(addDays(selectedDate, -1))}
          >
            <ChevronLeft size={18} strokeWidth={2} aria-hidden />
          </IconButton>
          <div className="min-w-0 text-center">
            <Heading as="h2" size="medium">
              {formatDayHeader(selectedDate)}
            </Heading>
            <Caption as="p" size="xs" weight={600} className="uppercase tracking-wide">
              {selectedDate === todayIso ? "Today" : "This week"}
            </Caption>
          </div>
          <IconButton
            a11yLabel="Next day"
            variant="soft"
            disabled={atWeekEnd}
            onClick={() => setPicked(addDays(selectedDate, 1))}
          >
            <ChevronRight size={18} strokeWidth={2} aria-hidden />
          </IconButton>
        </div>
      }
    >
      <div className="flex-1 px-5 py-4 sm:px-6">
        {windows.length === 0 ? (
          <Body
            size="small"
            color="muted"
            className="rounded-md border border-border bg-card px-3 py-4 text-center"
          >
            No hours this day.
          </Body>
        ) : (
          <ul aria-label={`Windows on ${selectedDate}`} className="flex flex-col gap-2">
            {windows.map(({ window, additional }, index) => (
              <li
                key={`${window.startAt}-${window.endAt}-${index}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5"
              >
                <Body as="span" size="small" weight={600} className="tabular-nums">
                  {formatWindow(window, timeZone)}
                </Body>
                <Badge variant={additional ? "primary" : "success"}>
                  {additional ? "Extra" : "Available"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
