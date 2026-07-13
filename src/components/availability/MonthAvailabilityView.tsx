"use client";

import { useMemo, useState } from "react";
import { Button, Calendar, Card, Popover, type CalendarDay } from "@/components/ui";
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
import { cn } from "@/lib/utils";

const FALLBACK_TIMEZONE = "America/Los_Angeles";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

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

function addMonths(cursor: MonthCursor, delta: number): MonthCursor {
  const zeroBased = cursor.month - 1 + delta;
  const year = cursor.year + Math.floor(zeroBased / 12);
  const month = ((zeroBased % 12) + 12) % 12;
  return { year, month: month + 1 };
}

/**
 * Calendar-centric "actual availability" month view (CTL-55 v2). Built on the generic
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

  const [cursor, setCursor] = useState<MonthCursor>(() => {
    const { year, month } = partsInTimeZone(new Date(), settingsTimezone);
    return { year, month };
  });
  const [hovered, setHovered] = useState<{ iso: string; anchorEl: HTMLElement } | null>(null);

  const resolvedOccurrences = resolvedQuery.data?.occurrences;
  const exceptions = exceptionsQuery.data;

  const occurrencesByDate = useMemo(
    () => bucketOccurrencesByDate(resolvedOccurrences ?? [], settingsTimezone),
    [resolvedOccurrences, settingsTimezone],
  );

  /** Per-date set of ADDITIONAL exception start times ("HH:mm", settings-local) — used only
   *  to flag which resolved windows get the blue "Extra" accent; the occurrences already
   *  reflect the net result (FE-never-recomputes). */
  const additionalStartsByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const exc of exceptions ?? ([] as AvailabilityException[])) {
      if (exc.kind !== "ADDITIONAL") continue;
      const set = map.get(exc.exceptionDate) ?? new Set<string>();
      set.add(exc.startLocal);
      map.set(exc.exceptionDate, set);
    }
    return map;
  }, [exceptions]);

  const todayIso = useMemo(
    () => isoDateInTimeZone(new Date(), settingsTimezone),
    [settingsTimezone],
  );

  const cells: DayCell[] = useMemo(() => {
    const total = daysInMonth(cursor.year, cursor.month);
    const result: DayCell[] = [];
    for (let day = 1; day <= total; day++) {
      const iso = `${cursor.year}-${pad2(cursor.month)}-${pad2(day)}`;
      const rawWindows = occurrencesByDate.get(iso) ?? [];
      const additionalStarts = additionalStartsByDate.get(iso);
      let totalMinutes = 0;
      const windows: DayWindow[] = rawWindows.map((window) => {
        totalMinutes += minutesBetween(window.startAt, window.endAt);
        const startHHmm = new Intl.DateTimeFormat("en-GB", {
          timeZone: settingsTimezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
          .format(new Date(window.startAt))
          .replace(/^24:/, "00:");
        return { window, additional: additionalStarts?.has(startHHmm) ?? false };
      });
      result.push({
        iso,
        day,
        windows,
        totalMinutes,
        hasAdditional: (additionalStarts?.size ?? 0) > 0,
        isToday: iso === todayIso,
      });
    }
    return result;
  }, [cursor, occurrencesByDate, additionalStartsByDate, settingsTimezone, todayIso]);

  const monthLabel = `${MONTH_NAMES[cursor.month - 1]} ${cursor.year}`;
  const hoveredCell = hovered ? cells.find((cell) => cell.iso === hovered.iso) : undefined;

  const calendarDays: CalendarDay[] = cells.map((cell) => ({
    date: cell.iso,
    day: cell.day,
    isToday: cell.isToday,
    muted: cell.totalMinutes <= 0,
    ariaLabel: `${cell.iso}${cell.isToday ? ", today" : ""}`,
    content: <DensityBar cell={cell} timeZone={settingsTimezone} />,
  }));

  return (
    <Card
      role="region"
      aria-label="Actual availability"
      padded={false}
      className="overflow-visible"
    >
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="font-display text-[20px] font-bold text-ink">Actual availability</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            What participants can actually book, shown by day. Hover a day for details, click a day
            to add a one-off override.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Previous month"
            onClick={() => setCursor((prev) => addMonths(prev, -1))}
          >
            ‹
          </Button>
          <span className="min-w-[8rem] text-center text-[14px] font-semibold text-ink">
            {monthLabel}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Next month"
            onClick={() => setCursor((prev) => addMonths(prev, 1))}
          >
            ›
          </Button>
        </div>
      </div>

      <div className="px-5 py-4 sm:px-6">
        <Calendar
          year={cursor.year}
          month={cursor.month}
          days={calendarDays}
          hoveredDate={hovered?.iso ?? null}
          onDayClick={(iso) => onOpenOverride(iso)}
          onDayHover={(iso, anchorEl) => setHovered(iso && anchorEl ? { iso, anchorEl } : null)}
        />

        <Legend />
      </div>

      <Popover
        open={Boolean(hoveredCell)}
        anchorEl={hovered?.anchorEl ?? null}
        onClose={() => setHovered(null)}
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
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-soft">
      <span>Density bar spans 12:00 AM – 12:00 AM (full day):</span>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={cn("inline-block h-3 w-3 rounded-sm", item.className)} aria-hidden />
          {item.label}
        </span>
      ))}
    </div>
  );
}
