"use client";

import { useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import {
  useAvailabilitySettings,
  useResolvedAvailability,
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

const WEEKDAY_HEADS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type DensityBucket = "none" | "low" | "mid" | "high";

interface MonthCursor {
  year: number;
  month: number; // 1-12
}

interface DayCell {
  iso: string;
  day: number;
  windows: AvailabilityOccurrence[];
  totalMinutes: number;
  density: DensityBucket;
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

/** Calendar-day arithmetic only (no clock time involved) — safe to do in UTC regardless of the
 *  settings timezone, since year/month/day were already resolved via `partsInTimeZone` above. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

/** Sum a day's occurrence durations for the density bucket — the only arithmetic allowed on the
 *  backend-resolved windows (never overlap/trim/coalesce). */
function minutesBetween(startAt: string, endAt: string): number {
  return Math.max(0, (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
}

function densityBucket(totalMinutes: number): DensityBucket {
  if (totalMinutes <= 0) return "none";
  if (totalMinutes < 120) return "low";
  if (totalMinutes < 300) return "mid";
  return "high";
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

const DENSITY_STYLES: Record<DensityBucket, string> = {
  none: "bg-[repeating-linear-gradient(135deg,var(--color-border)_0,var(--color-border)_2px,transparent_2px,transparent_6px)] text-ink-soft",
  low: "bg-primary-soft/50 text-ink",
  mid: "bg-primary-soft text-ink",
  high: "bg-primary/80 text-white",
};

function addMonths(cursor: MonthCursor, delta: number): MonthCursor {
  const zeroBased = cursor.month - 1 + delta;
  const year = cursor.year + Math.floor(zeroBased / 12);
  const month = ((zeroBased % 12) + 12) % 12;
  return { year, month: month + 1 };
}

/**
 * Month-density "actual availability" calendar (CTL-55 v2.1) — replaces the flat occurrence list
 * `ResolvedAvailabilityPreview` (superseded, removed in Task 5). Buckets the backend-resolved
 * `occurrences` by settings-tz calendar date (rendering only — no client-side coalescing): each
 * day cell shows a density indicator, with a hatch/grey pattern for a day with zero net
 * availability. Hovering a day opens a summary popover listing that day's windows 1:1, formatted
 * in the settings timezone. Clicking a day invokes `onOpenOverride` with its ISO date so the page
 * can open the date-specific override modal (Task 4/5).
 */
export function MonthAvailabilityView({ onOpenOverride }: MonthAvailabilityViewProps) {
  const resolvedQuery = useResolvedAvailability();
  const settingsQuery = useAvailabilitySettings();
  const settingsTimezone = settingsQuery.data?.timezone ?? FALLBACK_TIMEZONE;

  const [cursor, setCursor] = useState<MonthCursor>(() => {
    const { year, month } = partsInTimeZone(new Date(), settingsTimezone);
    return { year, month };
  });
  const [hoveredIso, setHoveredIso] = useState<string | null>(null);

  const resolvedOccurrences = resolvedQuery.data?.occurrences;

  const occurrencesByDate = useMemo(
    () => bucketOccurrencesByDate(resolvedOccurrences ?? [], settingsTimezone),
    [resolvedOccurrences, settingsTimezone],
  );

  const todayIso = useMemo(
    () => isoDateInTimeZone(new Date(), settingsTimezone),
    [settingsTimezone],
  );

  const cells: DayCell[] = useMemo(() => {
    const total = daysInMonth(cursor.year, cursor.month);
    const result: DayCell[] = [];
    for (let day = 1; day <= total; day++) {
      const iso = `${cursor.year}-${pad2(cursor.month)}-${pad2(day)}`;
      const windows = occurrencesByDate.get(iso) ?? [];
      const totalMinutes = windows.reduce(
        (sum, window) => sum + minutesBetween(window.startAt, window.endAt),
        0,
      );
      result.push({
        iso,
        day,
        windows,
        totalMinutes,
        density: densityBucket(totalMinutes),
        isToday: iso === todayIso,
      });
    }
    return result;
  }, [cursor, occurrencesByDate, todayIso]);

  const leadingBlanks = firstWeekdayOfMonth(cursor.year, cursor.month);
  const monthLabel = `${MONTH_NAMES[cursor.month - 1]} ${cursor.year}`;
  const hoveredCell = hoveredIso ? cells.find((cell) => cell.iso === hoveredIso) : undefined;

  const clearHover = (iso: string) => {
    setHoveredIso((prev) => (prev === iso ? null : prev));
  };

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
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
          {WEEKDAY_HEADS.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, index) => (
            <div key={`blank-${index}`} aria-hidden />
          ))}
          {cells.map((cell) => (
            <button
              key={cell.iso}
              type="button"
              data-testid={`month-day-${cell.iso}`}
              data-density={cell.density}
              data-hatch={cell.density === "none" ? "true" : "false"}
              data-today={cell.isToday ? "true" : "false"}
              aria-label={`${cell.iso}${cell.isToday ? ", today" : ""}`}
              onClick={() => onOpenOverride(cell.iso)}
              onMouseEnter={() => setHoveredIso(cell.iso)}
              onMouseLeave={() => clearHover(cell.iso)}
              onFocus={() => setHoveredIso(cell.iso)}
              onBlur={() => clearHover(cell.iso)}
              className={cn(
                "flex h-12 items-center justify-center rounded-md border text-[13px] font-medium transition-colors",
                cell.isToday ? "border-2 border-ink" : "border-border",
                DENSITY_STYLES[cell.density],
              )}
            >
              {cell.day}
            </button>
          ))}
        </div>

        {hoveredCell ? (
          <div
            role="tooltip"
            aria-label={`Availability for ${hoveredCell.iso}`}
            className="mt-3 rounded-md border border-border bg-card p-3 text-[13px]"
          >
            {hoveredCell.windows.length === 0 ? (
              <p className="text-ink-soft">No availability.</p>
            ) : (
              <ul aria-label={`Windows on ${hoveredCell.iso}`} className="space-y-1">
                {hoveredCell.windows.map((window, index) => (
                  <li key={`${window.startAt}-${window.endAt}-${index}`} className="text-ink">
                    {formatWindow(window, settingsTimezone)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
