"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Calendar — a generic month grid (CTL-55). Renders weekday heads + week rows of
 * day-of-month cells for the given `year`/`month`, driven entirely by the `days`
 * array the consumer hands it. It knows nothing about "availability": each day's
 * bar/marker is whatever `content` node the consumer supplies (or `renderDay`).
 *
 * The Calendar itself only owns three visual states it's told to apply:
 *  - `isToday`  → a dark outline ring;
 *  - the hovered day (via `hoveredDate`) → a distinct coloured (primary) outline;
 *  - `muted`    → the whole cell gets the hatched/grey "unavailable" treatment
 *                 (`.calendar-hatch`, see globals.css) instead of a bar.
 *
 * Cells are real `<button>`s with a full-date `aria-label` and grid semantics, so
 * keyboard/focus works; hover/focus both report an anchor element for popovers.
 */

/** Sun=0 .. Sat=6, matching `Date.getUTCDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CalendarDay {
  /** ISO calendar date `yyyy-mm-dd`. */
  date: string;
  /** Day-of-month number to print. */
  day: number;
  isToday?: boolean;
  /** Whole-cell hatched/grey "unavailable" treatment. */
  muted?: boolean;
  /** Full-date a11y label; defaults to `date`. */
  ariaLabel?: string;
  /** Per-day content (e.g. a density bar). Ignored when `renderDay` is given. */
  content?: ReactNode;
}

export interface CalendarProps {
  /** Full year, e.g. 2026. */
  year: number;
  /** Month, 1–12. */
  month: number;
  /** One entry per in-month day, in day order (1..N). */
  days: CalendarDay[];
  /** 0 = Sunday, 1 = Monday (default, matching the markup M T W T F S S). */
  weekStartsOn?: 0 | 1;
  /** The currently hovered/active date, for the coloured hover outline. */
  hoveredDate?: string | null;
  onDayClick?: (date: string) => void;
  /** Fires on mouse-enter/focus with the cell element, and on leave/blur with nulls. */
  onDayHover?: (date: string | null, anchorEl: HTMLElement | null) => void;
  /** Custom per-day renderer; overrides `day.content`. */
  renderDay?: (day: CalendarDay) => ReactNode;
  className?: string;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Sun-based weekday (0–6) of the month's first day — pure calendar arithmetic in
 *  UTC (no clock time involved), so it's tz-independent. */
function firstWeekdayOfMonth(year: number, month: number): Weekday {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay() as Weekday;
}

export function Calendar({
  year,
  month,
  days,
  weekStartsOn = 1,
  hoveredDate,
  onDayClick,
  onDayHover,
  renderDay,
  className,
}: CalendarProps) {
  const heads = Array.from({ length: 7 }, (_, i) => WEEKDAY_LABELS[(i + weekStartsOn) % 7]);
  const firstWeekday = firstWeekdayOfMonth(year, month);
  const leadingBlanks = (firstWeekday - weekStartsOn + 7) % 7;

  return (
    <div className={className} role="grid" aria-label={`${year}-${month} calendar`}>
      <div
        role="row"
        className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-soft"
      >
        {heads.map((label) => (
          <div key={label} role="columnheader">
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, index) => (
          <div key={`blank-${index}`} aria-hidden />
        ))}
        {days.map((d) => {
          const isHovered = hoveredDate != null && d.date === hoveredDate;
          return (
            <button
              key={d.date}
              type="button"
              role="gridcell"
              data-testid={`calendar-day-${d.date}`}
              data-today={d.isToday ? "true" : "false"}
              data-muted={d.muted ? "true" : "false"}
              aria-label={d.ariaLabel ?? d.date}
              aria-current={d.isToday ? "date" : undefined}
              onClick={() => onDayClick?.(d.date)}
              onMouseEnter={(e) => onDayHover?.(d.date, e.currentTarget)}
              onMouseLeave={() => onDayHover?.(null, null)}
              onFocus={(e) => onDayHover?.(d.date, e.currentTarget)}
              onBlur={() => onDayHover?.(null, null)}
              className={cn(
                "relative flex h-16 flex-col items-stretch gap-1 rounded-md border border-border bg-card p-1.5 text-left text-[13px] font-medium text-ink transition-colors",
                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-soft",
                "hover:border-primary/60",
                d.muted && "calendar-hatch text-ink-soft",
                // Today: dark outline ring. Hover: distinct primary (blue) outline.
                // Both use box-shadow rings so they can stack without shifting layout.
                d.isToday && "ring-2 ring-ink ring-offset-1 ring-offset-card",
                isHovered && "ring-2 ring-primary ring-offset-1 ring-offset-card",
              )}
            >
              <span className="text-[12px] leading-none tabular-nums">{d.day}</span>
              {!d.muted ? (
                <span className="min-h-0 flex-1">{renderDay ? renderDay(d) : d.content}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
