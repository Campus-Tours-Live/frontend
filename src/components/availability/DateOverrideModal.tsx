"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Modal, SelectField, TextField } from "@/components/ui";
import {
  ApiError,
  useAvailabilitySettings,
  useCreateAvailabilityException,
  useOverridePreview,
  useResolvedAvailability,
  type AvailabilityExceptionKind,
  type AvailabilityOccurrence,
  type OverridePreviewDay,
  type OverridePreviewParams,
} from "@/lib/data-access";
import {
  buildToOptions,
  formatClockLabel,
  formatFromTo,
  minutesFromHHmm,
  toWindowMin,
} from "@/lib/availability/fromTo";
import { bucketOccurrencesByDate } from "@/lib/availability/bucketByDate";
import {
  TimeAxis,
  TimeAxisBar,
  TimeAxisLegend,
  type TimeAxisSegment,
  type TimeAxisTick,
} from "./TimeAxisBar";
import { useDebounced } from "@/hooks";
import { todayIsoDate } from "./availabilityHelpers";

const FALLBACK_TIMEZONE = "America/Los_Angeles";

/** Debounce delay (ms) between the last form edit and firing the dry-run preview request —
 *  keeps the guide from triggering a network round-trip on every keystroke. */
const PREVIEW_DEBOUNCE_MS = 400;

/** Two-segment control labels. `kind` = ADDITIONAL/UNAVAILABLE drives the whole modal. */
const SEGMENT_LABELS: Record<AvailabilityExceptionKind, string> = {
  ADDITIONAL: "Add extra",
  UNAVAILABLE: "Block time off",
};

/** How a kind reads in prose / the legend (ADDITIONAL → "Extra", UNAVAILABLE → "Time off"). */
const KIND_NOUN: Record<AvailabilityExceptionKind, string> = {
  ADDITIONAL: "Extra",
  UNAVAILABLE: "Time off",
};

export interface DateOverrideModalProps {
  open: boolean;
  onClose: () => void;
  /** Prefills `dateFrom`/`dateTo` — e.g. the ISO date clicked in `MonthAvailabilityView`'s
   *  `onOpenOverride`. Defaults to today when omitted. */
  initialDate?: string | null;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function safeWindowMin(from: string, to: string): number | null {
  try {
    return toWindowMin(from, to);
  } catch {
    return null;
  }
}

function formatClockTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Render one window's from–to exactly as returned — 1:1, never merged with a neighbor (mirrors
 *  `MonthAvailabilityView`'s `formatWindow`). */
function formatOccurrence(window: AvailabilityOccurrence, timeZone: string): string {
  return `${formatClockTime(window.startAt, timeZone)} – ${formatClockTime(window.endAt, timeZone)}`;
}

/** "Fri 7/18"-style weekday + M/D for the modal title. Derived from the ISO calendar date at
 *  UTC-noon (avoids any tz-boundary slip); presentation only. */
function formatWeekdayMonthDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
  return `${weekday} ${month}/${day}`;
}

/** Minutes-of-day (0–1440) of `iso` AS SEEN in `timeZone` — a rendering coordinate, not
 *  availability math (mirrors `MonthAvailabilityView`'s `localMinutesOfDay`). */
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

function minutesBetween(startAt: string, endAt: string): number {
  return Math.max(0, (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
}

/** End-min of a window that never collapses at midnight: start-min + duration (so a window
 *  ending at 24:00 reads as 1440, not 0). */
function windowEndMin(window: AvailabilityOccurrence, timeZone: string): number {
  return localMinutesOfDay(window.startAt, timeZone) + minutesBetween(window.startAt, window.endAt);
}

/** Same start/end instants, in order — presentation comparison of two backend-provided window
 *  lists (before vs after), NOT a recompute of availability. */
function windowsEqual(a: AvailabilityOccurrence[], b: AvailabilityOccurrence[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((win, i) => win.startAt === b[i].startAt && win.endAt === b[i].endAt);
}

function minutesToHHmm(min: number): string {
  if (min >= 1440) return "24:00";
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}

/** A per-affected-date view model for the dry-run visual. Pure presentation of backend data —
 *  before windows (bucketed resolved occurrences), after windows (`resultingWindows`), the
 *  blocked/extra band (`trimmed` for a block, the proposed override for extra), the shared axis
 *  range/ticks, and whether this date is a conflict. */
interface DayView {
  date: string;
  before: AvailabilityOccurrence[];
  nowSegments: TimeAxisSegment[];
  afterSegments: TimeAxisSegment[];
  rangeStartMin: number;
  rangeEndMin: number;
  ticks: TimeAxisTick[];
  conflict: boolean;
}

/** Build the presentation view model for one affected date. All windows/trims come straight
 *  from the backend (resolved occurrences + the dry-run response); the only computation here is
 *  time→x range/tick math and an equality check for the conflict flag (never availability math). */
function buildDayView(
  day: OverridePreviewDay,
  before: AvailabilityOccurrence[],
  kind: AvailabilityExceptionKind,
  from: string,
  windowMin: number,
  timeZone: string,
): DayView {
  const nowSegments: TimeAxisSegment[] = before.map((win) => ({
    startMin: localMinutesOfDay(win.startAt, timeZone),
    endMin: windowEndMin(win, timeZone),
    kind: "available",
    label: formatOccurrence(win, timeZone),
  }));

  const afterSegments: TimeAxisSegment[] = day.resultingWindows.map((win) => ({
    startMin: localMinutesOfDay(win.startAt, timeZone),
    endMin: windowEndMin(win, timeZone),
    kind: "available",
    label: formatOccurrence(win, timeZone),
  }));

  if (kind === "UNAVAILABLE") {
    // The blocked part = the weekly windows Core says this override trims (accurate to the
    // dry-run), rendered hatched as "Time off".
    for (const trim of day.trimmed) {
      const startMin = minutesFromHHmm(trim.startLocal);
      afterSegments.push({
        startMin,
        endMin: startMin + trim.windowMin,
        kind: "off",
        label: formatFromTo(trim.startLocal, trim.windowMin),
      });
    }
  } else {
    // Extra availability: the proposed override window itself, rendered blue as "Extra".
    const startMin = minutesFromHHmm(from);
    afterSegments.push({
      startMin,
      endMin: startMin + windowMin,
      kind: "extra",
      label: formatFromTo(from, windowMin),
    });
  }

  // Axis range: earliest start → latest end across both bars, padded to whole hours.
  const allMins = [...nowSegments, ...afterSegments].flatMap((s) => [s.startMin, s.endMin]);
  let rangeStartMin = 0;
  let rangeEndMin = 1440;
  if (allMins.length > 0) {
    rangeStartMin = Math.floor(Math.min(...allMins) / 60) * 60;
    rangeEndMin = Math.ceil(Math.max(...allMins) / 60) * 60;
    if (rangeEndMin <= rangeStartMin) rangeEndMin = rangeStartMin + 60;
  }

  // Ticks: whole-hour marks (coarser over a wide span) plus the proposed override's start/end.
  const step = rangeEndMin - rangeStartMin > 480 ? 120 : 60;
  const tickMins = new Set<number>();
  for (let m = rangeStartMin; m <= rangeEndMin; m += step) tickMins.add(m);
  tickMins.add(rangeEndMin);
  const overrideStart = minutesFromHHmm(from);
  tickMins.add(overrideStart);
  tickMins.add(overrideStart + windowMin);
  const ticks: TimeAxisTick[] = Array.from(tickMins)
    .filter((m) => m >= rangeStartMin && m <= rangeEndMin)
    .sort((a, b) => a - b)
    .map((m) => ({ min: m, label: formatClockLabel(minutesToHHmm(m)) }));

  const conflict = day.trimmed.length > 0 || !windowsEqual(before, day.resultingWindows);

  return {
    date: day.date,
    before,
    nowSegments,
    afterSegments,
    rangeStartMin,
    rangeEndMin,
    ticks,
    conflict,
  };
}

/** Compose the amber conflict-warning body from the dry-run — pure PRESENTATION of Core's
 *  before/after, never a recompute. Names what each affected date currently has and what it
 *  becomes after applying. */
function conflictSentences(
  conflictDays: DayView[],
  kind: AvailabilityExceptionKind,
  timeZone: string,
): string[] {
  const noun = KIND_NOUN[kind];
  return conflictDays.map((view) => {
    const currently =
      view.before.length > 0
        ? view.before.map((win) => formatOccurrence(win, timeZone)).join(", ")
        : "no hours";
    const availableLabels = view.afterSegments
      .filter((segment) => segment.kind === "available")
      .map((segment) => segment.label);
    const after = availableLabels.length > 0 ? availableLabels.join(", ") : "no hours";
    const day = formatWeekdayMonthDay(view.date);
    return `This overrides the current hours for ${day}: it currently has ${currently}. After applying, the overlapping part becomes ${noun} and the rest stays as-is (becomes ${after}).`;
  });
}

/** Surfaces the backend's 422 message verbatim (overlap / trim / date-range-too-long) — this
 *  modal never pre-computes or blocks on validity client-side (FE-never-recomputes). The dry-run
 *  preview + this 422 are the only sources of truth. */
export function dateOverrideErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 422) {
    return err.message || "This override could not be applied.";
  }
  return "Could not save this override. Please try again.";
}

function DateOverrideModalContent({ initialDate, onClose }: Omit<DateOverrideModalProps, "open">) {
  const settingsQuery = useAvailabilitySettings();
  const resolvedQuery = useResolvedAvailability();
  const createException = useCreateAvailabilityException();

  const settingsTimezone = settingsQuery.data?.timezone ?? FALLBACK_TIMEZONE;

  const [mode, setMode] = useState<AvailabilityExceptionKind>("UNAVAILABLE");
  const [dateFrom, setDateFrom] = useState(initialDate ?? todayIsoDate());
  const [dateTo, setDateTo] = useState(initialDate ?? todayIsoDate());
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("10:00");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const windowMin = useMemo(() => safeWindowMin(from, to), [from, to]);

  // Only a fully-formed, structurally valid form produces preview params — the query stays
  // disabled (no fetch) until then. Debounced so the guide filling in the form doesn't fire a
  // preview request per keystroke.
  const rawPreviewParams: OverridePreviewParams | null = useMemo(() => {
    if (!dateFrom || !dateTo || windowMin === null) return null;
    return { dateFrom, dateTo, kind: mode, startLocal: from, windowMin };
  }, [dateFrom, dateTo, mode, from, windowMin]);
  const debouncedPreviewParams = useDebounced(rawPreviewParams, PREVIEW_DEBOUNCE_MS);
  const previewQuery = useOverridePreview(debouncedPreviewParams);

  const occurrencesByDate = useMemo(
    () => bucketOccurrencesByDate(resolvedQuery.data?.occurrences ?? [], settingsTimezone),
    [resolvedQuery.data?.occurrences, settingsTimezone],
  );

  const previewDays = previewQuery.data?.days;

  // Per-affected-date view models (bars + conflict flag). Only built when the window is valid.
  const dayViews = useMemo<DayView[]>(() => {
    if (windowMin === null) return [];
    return (previewDays ?? []).map((day) =>
      buildDayView(
        day,
        occurrencesByDate.get(day.date) ?? [],
        mode,
        from,
        windowMin,
        settingsTimezone,
      ),
    );
  }, [previewDays, occurrencesByDate, mode, from, windowMin, settingsTimezone]);

  const conflictDays = dayViews.filter((view) => view.conflict);
  const conflictMessages =
    conflictDays.length > 0 ? conflictSentences(conflictDays, mode, settingsTimezone) : [];

  const previewLoading = previewQuery.isLoading || previewQuery.isFetching;

  const handleConfirm = async () => {
    setError(null);
    const win = safeWindowMin(from, to);
    if (win === null) {
      setError("Enter a valid from–to range.");
      return;
    }

    setSubmitting(true);
    try {
      await createException.mutateAsync({
        dateFrom,
        dateTo,
        kind: mode,
        startLocal: from,
        windowMin: win,
      });
      onClose();
    } catch (err) {
      // Keep the modal open (do NOT call onClose) and show the backend message in-modal — Core
      // decides validity/trim; the FE never pre-emptively blocks on overlap/trim/date-range size.
      setError(dateOverrideErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const header = (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        Date-specific override
      </p>
      <h2
        id="date-override-modal-title"
        className="mt-1 font-display text-[22px] font-bold text-ink"
      >
        Date-specific hours · {formatWeekdayMonthDay(dateFrom)}
      </h2>
    </div>
  );

  const footer = (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
        Cancel
      </Button>
      <Button
        type="button"
        variant="primary"
        onClick={() => void handleConfirm()}
        disabled={submitting}
      >
        {submitting ? "Saving…" : "Confirm change"}
      </Button>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      labelledBy="date-override-modal-title"
      className="max-w-lg"
      header={header}
      footer={footer}
    >
      <div className="space-y-5">
        <Alert variant="info" role="status">
          This is a single-day override — it does not change your weekly hours. For recurring
          changes, use Weekly hours.
        </Alert>

        {error ? <Alert variant="error">{error}</Alert> : null}

        {conflictMessages.length > 0 ? (
          <Alert variant="warning" role="status">
            <ul className="space-y-1">
              {conflictMessages.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
            <p className="mt-1 font-medium">Confirm the change?</p>
          </Alert>
        ) : null}

        <div
          role="group"
          aria-label="Override type"
          className="grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1"
        >
          {(Object.keys(SEGMENT_LABELS) as AvailabilityExceptionKind[]).map((key) => {
            const selected = mode === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                onClick={() => setMode(key)}
                className={
                  selected
                    ? "rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
                    : "rounded-full px-4 py-2 text-[13px] font-medium text-ink-soft hover:text-ink"
                }
              >
                {SEGMENT_LABELS[key]}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="text-[13px] font-medium text-ink">Dates (range allowed)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="From date"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <TextField
              label="To date"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[13px] font-medium text-ink">Time</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="From"
              type="time"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
            <SelectField label="To" value={to} onChange={(event) => setTo(event.target.value)}>
              {buildToOptions(to).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </div>
        </div>

        <div
          role="region"
          aria-label="Preview"
          className="rounded-md border border-border bg-card p-3"
        >
          <p className="text-[13px] font-medium text-ink">
            After applying (backend dry-run preview)
          </p>
          {debouncedPreviewParams === null ? (
            <p className="mt-2 text-[13px] text-ink-soft">
              Enter a valid date range and from–to time to see a preview.
            </p>
          ) : previewLoading ? (
            <p className="mt-2 text-[13px] text-ink-soft">Loading preview…</p>
          ) : dayViews.length === 0 ? (
            <p className="mt-2 text-[13px] text-ink-soft">No affected dates yet.</p>
          ) : (
            <>
              <ul className="mt-3 space-y-4">
                {dayViews.map((view) => (
                  <li key={view.date} aria-label={`Timeline for ${view.date}`}>
                    <p className="text-[12px] font-semibold text-ink">
                      {formatWeekdayMonthDay(view.date)}
                    </p>
                    <div className="mt-2 space-y-1">
                      <TimeAxisBar
                        barLabel="Now"
                        ariaLabel={`Current hours on ${view.date}`}
                        segments={view.nowSegments}
                        rangeStartMin={view.rangeStartMin}
                        rangeEndMin={view.rangeEndMin}
                      />
                      <TimeAxisBar
                        barLabel="After"
                        ariaLabel={`After applying on ${view.date}`}
                        segments={view.afterSegments}
                        rangeStartMin={view.rangeStartMin}
                        rangeEndMin={view.rangeEndMin}
                      />
                      <TimeAxis
                        ticks={view.ticks}
                        rangeStartMin={view.rangeStartMin}
                        rangeEndMin={view.rangeEndMin}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <TimeAxisLegend />
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

/**
 * Shared date-specific override modal (CTL-55) — a two-segment control picks the kind
 * (Add extra = `ADDITIONAL` / Block time off = `UNAVAILABLE`); a multi-day date range and a
 * same-day from–to time drive a debounced backend dry-run (`useOverridePreview`). The preview is
 * rendered as a per-date time-axis Now/After visual (green = Available, hatched = Time off,
 * blue = Extra) plus an amber conflict warning when the override changes existing hours — both
 * are pure presentation of Core's before/after/trimmed (FE-never-recomputes). "Before" windows
 * come from `useResolvedAvailability` bucketed via the shared `bucketOccurrencesByDate`; "after"
 * and "trimmed" come straight from the dry-run. Confirm calls `useCreateAvailabilityException`
 * with the multi-day input; on a backend 422 the modal stays open and shows the backend message.
 *
 * The `key` remount ties the form's seed to `initialDate`; the whole modal (Modal shell + form
 * state) lives in `DateOverrideModalContent` so the structured header/footer share that state.
 */
export function DateOverrideModal({ open, initialDate, onClose }: DateOverrideModalProps) {
  if (!open) return null;
  return (
    <DateOverrideModalContent
      key={initialDate ?? "new"}
      initialDate={initialDate}
      onClose={onClose}
    />
  );
}
