"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Body,
  Button,
  Calendar,
  Caption,
  Drawer,
  Heading,
  Panel,
  PanelHeader,
  Popover,
  type CalendarDay,
} from "@/components/ui";
import { useMediaQuery } from "@/hooks";
import {
  useAvailabilityExceptions,
  useAvailabilitySettings,
  useResolvedAvailability,
} from "@/lib/data-access";
import {
  bucketOccurrencesByDate,
  isoDateInTimeZone,
  partsInTimeZone,
} from "@/lib/availability/bucketByDate";
import {
  buildAdditionalIntervals,
  formatWindow,
  localMinutesOfDay,
  minutesBetween,
  resolveDayWindows,
  type ResolvedDayWindow,
} from "@/lib/availability/dayWindows";
import { cn } from "@/lib/utils";
import { formatDayHeader } from "./availabilityHelpers";

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

interface DayCell {
  iso: string;
  day: number;
  windows: ResolvedDayWindow[];
  totalMinutes: number;
  hasAdditional: boolean;
  isToday: boolean;
}

export interface MonthAvailabilityViewProps {
  /** A day cell was clicked (ISO yyyy-mm-dd). The page routes it — a detail sheet on mobile,
   *  the override editor on desktop. */
  onDayClick: (date: string) => void;
  /** Controlled: the day whose detail sheet is open (mobile), or null when none is. */
  daySheetDate: string | null;
  /** Dismiss the day sheet (backdrop/Escape/close). */
  onDaySheetClose: () => void;
  /** "Add/Edit override" tapped inside the day sheet, for that day's ISO date. */
  onEditOverride: (date: string) => void;
  /** Whether date overrides can be added right now. When false (no weekly hours set yet), the day
   *  sheet's "Add/Edit override" button is disabled and a notice explains why. */
  canAddOverride: boolean;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Calendar-day arithmetic only (no clock time) — safe in UTC regardless of the
 *  settings timezone. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** A `Date` (from `Calendar`'s `onMonthChange`) -> the `{year, month}` cursor. */
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
 * Calendar-centric "Bookable days" month view (CTL-55 v2). Built on the generic
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
export function MonthAvailabilityView({
  onDayClick,
  daySheetDate,
  onDaySheetClose,
  onEditOverride,
  canAddOverride,
}: MonthAvailabilityViewProps) {
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
  // Touch devices can't hover, so the hover summary popover is unreachable there — suppress it.
  // (The tap → day-sheet vs desktop → editor routing is decided by the page via onDayClick.)
  const isTouch = useMediaQuery("(hover: none), (max-width: 1023px)");
  // Desktop only: a day click while overrides are blocked (no weekly hours) shows a notice under the
  // calendar heading instead of opening the editor modal. Mobile shows the block inside the day sheet.
  const [blockedNotice, setBlockedNotice] = useState(false);

  const resolvedOccurrences = resolvedQuery.data?.occurrences;
  const exceptions = exceptionsQuery.data;

  const occurrencesByDate = useMemo(
    () => bucketOccurrencesByDate(resolvedOccurrences ?? [], settingsTimezone),
    [resolvedOccurrences, settingsTimezone],
  );

  // ADDITIONAL "Extra" coverage intervals per date (see `buildAdditionalIntervals`).
  const additionalIntervalsByDate = useMemo(
    () => buildAdditionalIntervals(exceptions),
    [exceptions],
  );

  const todayIso = useMemo(
    () => isoDateInTimeZone(new Date(), settingsTimezone),
    [settingsTimezone],
  );

  const cells: DayCell[] = useMemo(() => {
    const total = daysInMonth(activeCursor.year, activeCursor.month);
    const result: DayCell[] = [];
    for (let day = 1; day <= total; day++) {
      const iso = `${activeCursor.year}-${pad2(activeCursor.month)}-${pad2(day)}`;
      const windows = resolveDayWindows(
        iso,
        occurrencesByDate,
        additionalIntervalsByDate,
        settingsTimezone,
      );
      const totalMinutes = windows.reduce(
        (sum, { window }) => sum + minutesBetween(window.startAt, window.endAt),
        0,
      );
      result.push({
        iso,
        day,
        windows,
        totalMinutes,
        hasAdditional: (additionalIntervalsByDate.get(iso)?.length ?? 0) > 0,
        isToday: iso === todayIso,
      });
    }
    return result;
  }, [activeCursor, occurrencesByDate, additionalIntervalsByDate, settingsTimezone, todayIso]);

  const hoveredCell = hovered ? cells.find((cell) => cell.iso === hovered.iso) : undefined;
  const sheetCell = daySheetDate ? cells.find((cell) => cell.iso === daySheetDate) : undefined;

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
    <Panel
      role="region"
      aria-label="Bookable days"
      divider="inset"
      className="overflow-visible"
      header={
        <PanelHeader
          title="Bookable days"
          subtitle="What participants can actually book, shown by day. Select a day to see its details and add a one-off override."
        >
          {blockedNotice && !canAddOverride ? (
            <div className="mt-3 hidden lg:block">
              <Alert variant="warning" role="status">
                Set your weekly hours first — date overrides adjust your weekly schedule, so there
                is nothing to override yet.
              </Alert>
            </div>
          ) : null}
        </PanelHeader>
      }
    >
      <div className="px-5 py-4 sm:px-6">
        <Calendar
          year={activeCursor.year}
          month={activeCursor.month}
          days={calendarDays}
          weekStartsOn={0}
          onMonthChange={(next) => setCursor(dateToCursor(next))}
          monthNavAlign="center"
          hoveredDate={hovered?.iso ?? null}
          onDayClick={(iso) => {
            // Desktop can't add an override with no weekly hours: show the notice above instead of
            // routing the click to the editor modal. Mobile still opens the day sheet (which carries
            // its own disabled action + notice), so only gate the desktop path here.
            if (!canAddOverride && !isTouch) {
              setBlockedNotice(true);
              return;
            }
            onDayClick(iso);
          }}
          onDayHover={(iso, anchorEl) => {
            // Touch devices have no hover (browsers only emulate a "sticky" hover on tap), so
            // ignore hover there — a tap opens the day sheet instead (see onDayClick).
            if (isTouch) return;
            setHovered(iso && anchorEl ? { iso, anchorEl } : null);
          }}
        />

        <Legend />
      </div>

      {/* No `onClose`: this is a passive hover/focus summary that dismisses when the day cell's
          mouse-leave/blur clears `hovered` — so it must not register the Popover's outside-pointer /
          Escape GLOBAL listeners (those are for dismissible dialogs, not a tooltip). */}
      <Popover
        open={!isTouch && Boolean(hoveredCell)}
        anchorEl={hovered?.anchorEl ?? null}
        role="tooltip"
        aria-label={hoveredCell ? `Availability for ${hoveredCell.iso}` : undefined}
        className="w-64"
      >
        {hoveredCell ? <SummaryPopover cell={hoveredCell} timeZone={settingsTimezone} /> : null}
      </Popover>

      {/* Touch fallback for the hover popover: on tap, a bottom sheet shows the day's detail and
          an "Add override" action (which opens the full editor). Dismisses via backdrop/Escape. */}
      <Drawer
        open={Boolean(sheetCell)}
        onClose={onDaySheetClose}
        side="bottom"
        ariaLabel={sheetCell ? `Availability for ${sheetCell.iso}` : undefined}
        header={
          sheetCell ? (
            <Heading as="h3" size="h3">
              {formatDayHeader(sheetCell.iso)}
            </Heading>
          ) : undefined
        }
        footer={
          sheetCell ? (
            // A disabled `.btn` has `pointer-events-none`, so it can't show its own cursor — wrap it
            // so hovering the (disabled) button falls through to the span's `cursor-not-allowed`.
            <span className={cn("block", !canAddOverride && "cursor-not-allowed")}>
              <Button
                type="button"
                variant="primary"
                block
                disabled={!canAddOverride}
                onClick={() => onEditOverride(sheetCell.iso)}
              >
                {(exceptions ?? []).some((exc) => exc.exceptionDate === sheetCell.iso)
                  ? "Edit override"
                  : "Add override"}
              </Button>
            </span>
          ) : undefined
        }
      >
        {sheetCell ? (
          <div className="space-y-3">
            {/* No weekly hours yet → overrides adjust a baseline that doesn't exist. Disable the
                action (footer) and say why here. */}
            {!canAddOverride ? (
              <Alert variant="warning">
                Set your weekly hours first — date overrides adjust your weekly schedule, so there
                is nothing to override yet.
              </Alert>
            ) : null}
            <DaySheet cell={sheetCell} timeZone={settingsTimezone} />
          </div>
        ) : null}
      </Drawer>
    </Panel>
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

/** Backend-resolved day summary: a header (weekday + date + status), then each window as a row —
 *  the from–to time + an Available/Extra badge (same as the day sheet), formatted in settings tz. */
function SummaryPopover({ cell, timeZone }: { cell: DayCell; timeZone: string }) {
  const available = cell.windows.length > 0;
  const status = available ? "Available" : "Unavailable";
  return (
    <div className="rounded-card border border-border bg-popover p-3 text-ui-sm shadow-lg">
      <p className="font-semibold text-ink">
        {formatDayHeader(cell.iso)} · {status}
      </p>
      {available ? (
        <ul aria-label={`Windows on ${cell.iso}`} className="mt-2 space-y-1">
          {cell.windows.map(({ window, additional }, index) => (
            <li
              key={`${window.startAt}-${window.endAt}-${index}`}
              className="flex items-center justify-between gap-2 text-ink"
            >
              <span className="tabular-nums">{formatWindow(window, timeZone)}</span>
              <Badge variant={additional ? "primary" : "success"}>
                {additional ? "Extra" : "Available"}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-ink-soft">No hours</p>
      )}
      <Caption as="p" size="xs" className="mt-2 border-t border-border pt-2">
        Summary from resolved availability — not recomputed.
      </Caption>
    </div>
  );
}

/** Bottom-sheet body for a tapped day (the touch alternative to the hover popover): the day
 *  header + an "Add override" action, then each resolved window as a row with an Available/Extra
 *  pill. Pure presentation of resolved availability — never recomputed. */
function DaySheet({ cell, timeZone }: { cell: DayCell; timeZone: string }) {
  if (cell.windows.length === 0) {
    return (
      <Body
        size="small"
        color="muted"
        className="rounded-md border border-border bg-card px-3 py-4 text-center"
      >
        No hours set this day.
      </Body>
    );
  }
  return (
    <ul aria-label={`Windows on ${cell.iso}`} className="flex flex-col gap-2">
      {cell.windows.map(({ window, additional }, index) => (
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
    <Caption as="div" size="xs" className="mt-7 flex flex-col gap-2">
      <span>Density bar spans 12:00 AM – 12:00 AM (full day):</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {items.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={cn("inline-block h-3 w-3 rounded-sm", item.className)} aria-hidden />
            {item.label}
          </span>
        ))}
      </div>
    </Caption>
  );
}
