"use client";

import { useMemo, useState } from "react";
import { Calendar, Card, MonthYearPicker, Popover, type CalendarDay } from "@/components/ui";
import {
  useAvailabilityExceptions,
  useAvailabilitySettings,
  useResolvedAvailability,
  type AvailabilityException,
  type AvailabilityOccurrence,
} from "@/lib/data-access";
import {
  bucketOccurrencesByDate,
  isoDateInTimeZone,
  partsInTimeZone,
} from "@/lib/availability/bucketByDate";
import { minutesFromHHmm } from "@/lib/availability/fromTo";
import { cn } from "@/lib/utils";

const FALLBACK_TIMEZONE = "America/Los_Angeles";

/** The daily window the density bar spans, in minutes-of-day (00:00–24:00 = the
 *  full day, so every backend window fits without clipping). Labelled in the legend. */
const DAY_START_MIN = 0;
const DAY_END_MIN = 1440;
const DAY_SPAN_MIN = DAY_END_MIN - DAY_START_MIN;

interface MonthCursor {
  year: number;
  month: number; // 1-12
}

/** One backend-resolved window mapped for rendering — `additional` flags a window
 *  that matches an ADDITIONAL exception on the same date (blue accent + "Extra"
 *  label), never a recomputed one. */
interface DayWindow {
  window: AvailabilityOccurrence;
  additional: boolean;
}

interface DayCell {
  iso: string;
  day: number;
  windows: DayWindow[];
  totalMinutes: number;
  hasAdditional: boolean;
  isToday: boolean;
}

export interface MonthAvailabilityViewProps {
  /** Invoked with the clicked day's ISO date (yyyy-mm-dd) — the page wires this to the
   *  date-specific override modal (Task 4/5). */
  onOpenOverride: (date: string) => void;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Calendar-day arithmetic only (no clock time) — safe in UTC regardless of the
 *  settings timezone. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** A window's duration in minutes — the only arithmetic allowed on the backend-resolved
 *  windows (never overlap/trim/coalesce), used for the density bar length + total. */
function minutesBetween(startAt: string, endAt: string): number {
  return Math.max(0, (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
}

/** Minutes-of-day (0–1439) of `iso` AS SEEN in `timeZone` — for placing a window on
 *  the density bar. Purely a rendering coordinate, not availability math. */
function localMinutesOfDay(iso: string, timeZone: string): number {
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

function formatClockTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Render one window's from–to exactly as returned — 1:1, never merged with a neighbor. */
function formatWindow(window: AvailabilityOccurrence, timeZone: string): string {
  return `${formatClockTime(window.startAt, timeZone)} – ${formatClockTime(window.endAt, timeZone)}`;
}

/** Weekday-abbrev + M/D header, e.g. "Thu 7/17". The weekday is derived from the ISO
 *  calendar date itself (UTC noon avoids any tz-boundary slip). */
function formatDayHeader(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  return `${weekday} ${m}/${d}`;
}

/** `MonthCursor` <-> a month-start `Date`, for `MonthYearPicker` (which is date-based,
 *  not year/month-number based). */
function cursorToDate(cursor: MonthCursor): Date {
  return new Date(cursor.year, cursor.month - 1, 1);
}
function dateToCursor(date: Date): MonthCursor {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

/** The current {year, month} as seen in `timeZone` — the cursor's seed while the guide hasn't
 *  navigated yet. Derived at render time (not frozen at mount) so it stays correct even if the
 *  settings tz resolves after the first render. */
function currentMonthInTimeZone(timeZone: string): MonthCursor {
  const { year, month } = partsInTimeZone(new Date(), timeZone);
  return { year, month };
}

/**
 * Calendar-centric "Availability calendar" month view (CTL-55 v2). Built on the generic
 * `Calendar` + `Popover` UI primitives. Everything shown is derived from the
 * backend-resolved read (`occurrences`) and the exceptions list — the FE only buckets
 * occurrences by settings-tz date, maps window times to pixel/percentage positions, and
 * colours them. It NEVER recomputes net availability, overlaps, or merges:
 *
 *  - density bar   = a mini time-of-day timeline (00:00–24:00) with each day's resolved
 *                    windows filled green; a window matching an ADDITIONAL exception is
 *                    blue ("Extra");
 *  - fully unavailable (zero net minutes) → the whole cell is hatched (Calendar `muted`);
 *  - today          → dark outline; hovered → blue outline (Calendar handles both);
 *  - hover a day    → a summary Popover listing that day's windows 1:1 in settings tz;
 *  - click a day    → `onOpenOverride(iso)` (the page opens the override modal).
 */
export function MonthAvailabilityView({ onOpenOverride }: MonthAvailabilityViewProps) {
  const resolvedQuery = useResolvedAvailability();
  const settingsQuery = useAvailabilitySettings();
  const exceptionsQuery = useAvailabilityExceptions();
  const settingsTimezone = settingsQuery.data?.timezone ?? FALLBACK_TIMEZONE;

  // Null until the guide navigates: the displayed month is DERIVED from the settings tz each render
  // while `cursor` is null, so it's correct regardless of render order — if settings resolve after
  // the first render (e.g. rendered outside the page's loaded-gate), the "current month" follows the
  // real tz instead of freezing on the fallback tz at mount. Once the guide picks a month, `cursor`
  // holds it and navigation sticks.
  const [cursor, setCursor] = useState<MonthCursor | null>(null);
  const activeCursor: MonthCursor = cursor ?? currentMonthInTimeZone(settingsTimezone);
  const [hovered, setHovered] = useState<{ iso: string; anchorEl: HTMLElement } | null>(null);

  const resolvedOccurrences = resolvedQuery.data?.occurrences;
  const exceptions = exceptionsQuery.data;

  const occurrencesByDate = useMemo(
    () => bucketOccurrencesByDate(resolvedOccurrences ?? [], settingsTimezone),
    [resolvedOccurrences, settingsTimezone],
  );

  /** Per-date ADDITIONAL exception coverage intervals (settings-local minutes-of-day) — used only
   *  to flag which resolved windows get the blue "Extra" accent; the occurrences already reflect the
   *  net result (FE-never-recomputes). Kept as intervals (not raw start times) so the accent survives
   *  a backend-TRIMMED ADDITIONAL start: when Core clips an extra window's start (e.g. because its
   *  first minutes were already covered by weekly hours), the resolved window starts LATER than the
   *  exception's `startLocal`, so a start-string match would silently drop the accent — but the start
   *  still falls inside the exception's original [start, start+windowMin) interval. */
  const additionalIntervalsByDate = useMemo(() => {
    const map = new Map<string, { startMin: number; endMin: number }[]>();
    for (const exc of exceptions ?? ([] as AvailabilityException[])) {
      if (exc.kind !== "ADDITIONAL") continue;
      const startMin = minutesFromHHmm(exc.startLocal);
      const list = map.get(exc.exceptionDate) ?? [];
      list.push({ startMin, endMin: startMin + exc.windowMin });
      map.set(exc.exceptionDate, list);
    }
    return map;
  }, [exceptions]);

  const todayIso = useMemo(
    () => isoDateInTimeZone(new Date(), settingsTimezone),
    [settingsTimezone],
  );

  const cells: DayCell[] = useMemo(() => {
    const total = daysInMonth(activeCursor.year, activeCursor.month);
    const result: DayCell[] = [];
    for (let day = 1; day <= total; day++) {
      const iso = `${activeCursor.year}-${pad2(activeCursor.month)}-${pad2(day)}`;
      const rawWindows = occurrencesByDate.get(iso) ?? [];
      const additionalIntervals = additionalIntervalsByDate.get(iso);
      let totalMinutes = 0;
      const windows: DayWindow[] = rawWindows.map((window) => {
        totalMinutes += minutesBetween(window.startAt, window.endAt);
        const startMin = localMinutesOfDay(window.startAt, settingsTimezone);
        const additional =
          additionalIntervals?.some((iv) => startMin >= iv.startMin && startMin < iv.endMin) ??
          false;
        return { window, additional };
      });
      result.push({
        iso,
        day,
        windows,
        totalMinutes,
        hasAdditional: (additionalIntervals?.length ?? 0) > 0,
        isToday: iso === todayIso,
      });
    }
    return result;
  }, [activeCursor, occurrencesByDate, additionalIntervalsByDate, settingsTimezone, todayIso]);

  const hoveredCell = hovered ? cells.find((cell) => cell.iso === hovered.iso) : undefined;

  const calendarDays: CalendarDay[] = cells.map((cell) => {
    // Announce the day's booking status (backend-resolved, never recomputed) in the accessible name
    // so screen-reader users hear "…, Available/Unavailable" instead of a bare ISO date. "Extra"
    // days are still Available — the blue accent is a sighted-only refinement.
    const status = cell.totalMinutes > 0 ? "Available" : "Unavailable";
    return {
      date: cell.iso,
      day: cell.day,
      isToday: cell.isToday,
      muted: cell.totalMinutes <= 0,
      ariaLabel: `${cell.iso}, ${status}${cell.isToday ? ", today" : ""}`,
      content: <DensityBar cell={cell} timeZone={settingsTimezone} />,
    };
  });

  return (
    <Card
      role="region"
      aria-label="Availability calendar"
      padded={false}
      className="overflow-visible"
    >
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="font-display text-[20px] font-bold text-ink">Availability calendar</h2>
          <p className="text-[13px] text-ink-soft">
            What participants can actually book, shown by day. Hover a day for details, click a day
            to add a one-off override.
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-end">
          <MonthYearPicker
            value={cursorToDate(activeCursor)}
            onChange={(next) => setCursor(dateToCursor(next))}
            aria-label="Month"
          />
        </div>
      </div>

      <div className="px-5 py-4 sm:px-6">
        <Calendar
          year={activeCursor.year}
          month={activeCursor.month}
          days={calendarDays}
          weekStartsOn={0}
          hoveredDate={hovered?.iso ?? null}
          onDayClick={(iso) => onOpenOverride(iso)}
          onDayHover={(iso, anchorEl) => setHovered(iso && anchorEl ? { iso, anchorEl } : null)}
        />

        <Legend />
      </div>

      {/* No `onClose`: this is a passive hover/focus summary that dismisses when the day cell's
          mouse-leave/blur clears `hovered` — so it must not register the Popover's outside-pointer /
          Escape GLOBAL listeners (those are for dismissible dialogs, not a tooltip). */}
      <Popover
        open={Boolean(hoveredCell)}
        anchorEl={hovered?.anchorEl ?? null}
        role="tooltip"
        aria-label={hoveredCell ? `Availability for ${hoveredCell.iso}` : undefined}
        className="w-64"
      >
        {hoveredCell ? <SummaryPopover cell={hoveredCell} timeZone={settingsTimezone} /> : null}
      </Popover>
    </Card>
  );
}

/** The mini time-of-day timeline for a day cell (00:00–24:00): resolved windows filled
 *  green, ADDITIONAL-matching windows blue. Positions are `left`/`width` percentages of
 *  the day span — a pure time→x mapping, no availability math. */
function DensityBar({ cell, timeZone }: { cell: DayCell; timeZone: string }) {
  if (cell.windows.length === 0) return null;
  return (
    <div
      data-testid={`density-${cell.iso}`}
      data-additional={cell.hasAdditional ? "true" : "false"}
      className="relative mt-auto h-2 w-full overflow-hidden rounded-full bg-border/40"
      aria-hidden
    >
      {cell.windows.map(({ window, additional }, index) => {
        const startMin = localMinutesOfDay(window.startAt, timeZone);
        const durationMin = minutesBetween(window.startAt, window.endAt);
        const left = ((startMin - DAY_START_MIN) / DAY_SPAN_MIN) * 100;
        const width = Math.min(100 - left, (durationMin / DAY_SPAN_MIN) * 100);
        return (
          <span
            key={`${window.startAt}-${window.endAt}-${index}`}
            className={cn(
              "absolute inset-y-0 rounded-full",
              additional ? "bg-primary" : "bg-success",
            )}
            style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
          />
        );
      })}
    </div>
  );
}

/** Backend-resolved day summary: a header (weekday + date + status), then each window
 *  as a row with a colour dot (green available / blue "Extra"), formatted in settings tz. */
function SummaryPopover({ cell, timeZone }: { cell: DayCell; timeZone: string }) {
  const available = cell.windows.length > 0;
  const status = available ? "Available" : "Unavailable";
  return (
    <div className="rounded-card border border-border bg-popover p-3 text-[13px] shadow-lg">
      <p className="font-semibold text-ink">
        {formatDayHeader(cell.iso)} · {status}
      </p>
      {available ? (
        <ul aria-label={`Windows on ${cell.iso}`} className="mt-2 space-y-1">
          {cell.windows.map(({ window, additional }, index) => (
            <li
              key={`${window.startAt}-${window.endAt}-${index}`}
              className="flex items-center gap-2 text-ink"
            >
              <span
                aria-hidden
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  additional ? "bg-primary" : "bg-success",
                )}
              />
              <span className="tabular-nums">{formatWindow(window, timeZone)}</span>
              {additional ? (
                <span className="ml-auto text-[11px] font-semibold text-primary">Extra</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-ink-soft">No hours</p>
      )}
      <p className="mt-2 border-t border-border pt-2 text-[11px] text-ink-soft">
        Summary from resolved availability — not recomputed.
      </p>
    </div>
  );
}

/** Legend under the calendar (00:00–24:00 density scale). */
function Legend() {
  const items: { className: string; label: string }[] = [
    { className: "bg-success", label: "Available" },
    { className: "bg-primary", label: "Extra" },
    { className: "calendar-hatch border border-border", label: "Unavailable" },
    { className: "ring-2 ring-ink", label: "Today" },
  ];
  return (
    <div className="mt-7 flex flex-col gap-2 text-[11px] text-ink-soft">
      <span>Density bar spans 12:00 AM – 12:00 AM (full day):</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {items.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={cn("inline-block h-3 w-3 rounded-sm", item.className)} aria-hidden />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
