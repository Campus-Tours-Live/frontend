"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Alert, Button, Modal, TimePicker } from "@/components/ui";
import {
  ApiError,
  useAvailabilityExceptions,
  useAvailabilitySettings,
  useCreateAvailabilityException,
  useDeleteAvailabilityException,
  useOverrideMultiPreview,
  useResolvedAvailability,
  type AvailabilityException,
  type AvailabilityExceptionKind,
  type AvailabilityOccurrence,
  type OverrideMultiPreviewParams,
  type OverridePreviewDay,
  type OverrideWindow,
} from "@/lib/data-access";
import {
  formatFromTo,
  minutesFromHHmm,
  toWindowMin,
  windowToRawTo,
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
  ADDITIONAL: "Add extra time",
  UNAVAILABLE: "Block time off",
};

export interface DateOverrideModalProps {
  open: boolean;
  onClose: () => void;
  /** Prefills `dateFrom`/`dateTo` — e.g. the ISO date clicked in `MonthAvailabilityView`'s
   *  `onOpenOverride`. Defaults to today when omitted. */
  initialDate?: string | null;
}

/** One from–to time slot being edited. Mirrors `DayHoursModal`'s per-range draft so a
 *  date-specific override supports multiple slots on the same date the way weekly hours do.
 *  `key` is a stable React key. On Confirm the whole list is reconciled (delete the day's existing
 *  [kind] exceptions, then create these slots), so a slot carries no `id` — it's the desired end
 *  state, not a 1:1 edit of a specific existing row. */
interface SlotDraft {
  key: string;
  from: string;
  to: string;
}

let draftSeq = 0;
function nextSlotKey(): string {
  draftSeq += 1;
  return `slot-${draftSeq}`;
}

/** The day's exceptions of one kind, oldest-first, so the editor's rows keep a stable order. */
function exceptionsForKind(
  dayExceptions: AvailabilityException[],
  kind: AvailabilityExceptionKind,
): AvailabilityException[] {
  return dayExceptions.filter((exc) => exc.kind === kind);
}

/** Seed the editable slot list from a day's existing [kind] exceptions — one row per exception,
 *  prefilled from `startLocal` + `windowMin` (the `to` value round-trips through `windowToRawTo`,
 *  which yields the `"24:00"` sentinel for an end-of-day window). An empty list when the day has no
 *  override of this kind — the editor deliberately does NOT auto-populate a default row on open. */
function slotsFromExceptions(
  dayExceptions: AvailabilityException[],
  kind: AvailabilityExceptionKind,
): SlotDraft[] {
  return exceptionsForKind(dayExceptions, kind).map((exc) => ({
    key: nextSlotKey(),
    from: exc.startLocal,
    to: windowToRawTo(exc.startLocal, exc.windowMin),
  }));
}

/** Which kind's editor to open on: prefer the kind the day already has an override for (UNAVAILABLE
 *  wins if it has both), otherwise default to UNAVAILABLE ("Block time off"). */
function defaultKindForDay(dayExceptions: AvailabilityException[]): AvailabilityExceptionKind {
  if (dayExceptions.some((exc) => exc.kind === "UNAVAILABLE")) return "UNAVAILABLE";
  if (dayExceptions.some((exc) => exc.kind === "ADDITIONAL")) return "ADDITIONAL";
  return "UNAVAILABLE";
}

function safeWindowMin(from: string, to: string): number | null {
  try {
    return toWindowMin(from, to);
  } catch {
    return null;
  }
}

/** STRUCTURAL-only per-slot check (start before end / same-day) via `toWindowMin` — never
 *  overlap/trim, which stays backend-owned. Mirrors `DayHoursModal.structuralRangeError`. */
export function slotStructuralError(from: string, to: string): string | null {
  return safeWindowMin(from, to) === null ? "Start time must be before the end time." : null;
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
 *  lists (before vs after), NOT a recompute of availability. Compares by INSTANT VALUE
 *  (`Date#getTime`), not raw string equality: `useResolvedAvailability` (before) and the dry-run
 *  (after) are two different endpoints, and a genuinely equal instant can serialize differently
 *  between them (e.g. `…:00Z` vs `…:00.000Z`) — a raw-string compare would misreport a no-op as a
 *  conflict. */
function windowsEqual(a: AvailabilityOccurrence[], b: AvailabilityOccurrence[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (win, i) =>
      new Date(win.startAt).getTime() === new Date(b[i].startAt).getTime() &&
      new Date(win.endAt).getTime() === new Date(b[i].endAt).getTime(),
  );
}

/** A per-affected-date view model for the ONE combined dry-run visual. Pure presentation of
 *  backend data — before windows (bucketed resolved occurrences), after windows (the net
 *  `resultingWindows`) plus the blocked band or extra band (both derived from `proposed`, the
 *  user's own input windows — never `day.trimmed`, which spatially overlaps `resultingWindows`),
 *  the shared auto-ranged axis domain/ticks, and whether this date is a conflict. */
interface DayView {
  date: string;
  before: AvailabilityOccurrence[];
  nowSegments: TimeAxisSegment[];
  afterSegments: TimeAxisSegment[];
  conflict: boolean;
}

/** The preview renders each affected date split into a fixed AM half (12 AM–12 PM) and PM half
 *  (12 PM–12 AM), each its own 12-hour axis — a single auto-ranged full-day axis crowded its hour
 *  labels into an unreadable overlap in the narrow modal. Every date shows Now × 2 (AM + PM) and
 *  After × 2 (AM + PM). */
const NOON_MIN = 720;
const DAY_END_MIN = 1440;
const HALF_TICK_STEP_MIN = 120;

interface DayHalf {
  key: "am" | "pm";
  startMin: number;
  endMin: number;
}
const DAY_HALVES: DayHalf[] = [
  { key: "am", startMin: 0, endMin: NOON_MIN },
  { key: "pm", startMin: NOON_MIN, endMin: DAY_END_MIN },
];

/** Label one 2-hour tick: the two ENDPOINT ticks (first/last of the half) carry the AM/PM
 *  meridiem (e.g. "12 AM", "12 PM") since they anchor the half; the five ticks in between are
 *  BARE hour numbers ("2", "4", "6", "8", "10") — the half's AM/PM is already unambiguous from its
 *  endpoints, and a bare number is narrow enough that seven ticks never crowd the modal's width.
 *  Spelling out "12:00 PM" et al. on every tick (the old behaviour) was wide enough that the
 *  endpoint labels — centered on ticks that sit at the container's 0%/100% edge — wrapped onto a
 *  second line; shortening the middle labels frees the room the endpoints need to stay on one
 *  line (paired with edge alignment in `TimeAxis`). All ticks land on exact hours (2-hour step
 *  from a whole-hour start), so no minutes component is ever needed. */
function halfTickLabel(min: number, isEndpoint: boolean): string {
  const hour24 = Math.floor(min / 60) % 24;
  const hour12 = hour24 % 12 || 12;
  if (!isEndpoint) return String(hour12);
  return `${hour12} ${hour24 < 12 ? "AM" : "PM"}`;
}

/** Fixed 2-hour tick marks for one 12-hour half (AM: 12 AM, 2, 4, 6, 8, 10, 12 PM). Seven ticks
 *  across the half never collide in the modal, unlike the old full-day auto-ranged axis. */
function halfTicks(startMin: number, endMin: number): TimeAxisTick[] {
  const ticks: TimeAxisTick[] = [];
  for (let m = startMin; m <= endMin; m += HALF_TICK_STEP_MIN) {
    ticks.push({ min: m, label: halfTickLabel(m, m === startMin || m === endMin) });
  }
  return ticks;
}

/** Segments that intersect a given half-day window. `TimeAxisBar`'s clamping draws only the visible
 *  portion, so a segment that straddles noon appears (clipped) in both halves. */
function segmentsInHalf(segments: TimeAxisSegment[], half: DayHalf): TimeAxisSegment[] {
  return segments.filter((s) => s.startMin < half.endMin && s.endMin > half.startMin);
}

/**
 * Build the presentation view model for ONE affected date from the COMBINED (multi-window) dry-run.
 * The green "available" segments come straight from the backend's `resultingWindows` (net of ALL
 * slots for this date). The hatched "off" (Block time off) / blue "extra" (Add extra) segments are
 * built from `proposed` — the user's own input windows — NOT from `day.trimmed`: `trimmed` is the
 * clipped EXISTING windows, which spatially overlaps `resultingWindows`, so rendering it would show
 * green and hatched overlaid at the blocked time. Using `proposed` keeps the hatched band disjoint
 * from the green band. The only computation here is mapping those windows to time-axis segments and
 * an instant equality check for the conflict flag — never availability math (FE-never-recomputes).
 * The fixed AM/PM axis split happens at render time.
 */
function buildDayView(
  day: OverridePreviewDay,
  before: AvailabilityOccurrence[],
  kind: AvailabilityExceptionKind,
  proposed: OverrideWindow[],
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
    // The blocked part = the PROPOSED block windows (the user's own input, same source the
    // ADDITIONAL branch below uses for "extra"), rendered hatched as "Time off". `day.trimmed`
    // is the CLIPPED EXISTING windows, which spatially overlaps `resultingWindows` (the green
    // net-available result) — rendering it here made the blocked time show green AND hatched at
    // once. `proposed` is disjoint from `resultingWindows` by construction (Core nets the block
    // out of the resulting windows), so green/hatched never overlap. Still pure presentation of
    // the user's own input — no availability recompute.
    for (const win of proposed) {
      const startMin = minutesFromHHmm(win.startLocal);
      afterSegments.push({
        startMin,
        endMin: startMin + win.windowMin,
        kind: "off",
        label: formatFromTo(win.startLocal, win.windowMin),
      });
    }
  } else {
    // Extra availability: each proposed slot window, rendered blue as "Extra".
    for (const win of proposed) {
      const startMin = minutesFromHHmm(win.startLocal);
      afterSegments.push({
        startMin,
        endMin: startMin + win.windowMin,
        kind: "extra",
        label: formatFromTo(win.startLocal, win.windowMin),
      });
    }
  }

  // The amber conflict warning is block-framed prose ("this blocks time that overlaps your current
  // hours") — it only makes sense for a Block time off (UNAVAILABLE) override that actually changes
  // the day's hours. Add extra (ADDITIONAL) is additive/non-destructive — the Now/After bars
  // already show the addition, so it never raises this warning, even when it changes before→after.
  const conflict = kind === "UNAVAILABLE" && !windowsEqual(before, day.resultingWindows);

  return { date: day.date, before, nowSegments, afterSegments, conflict };
}

/** Compose the amber conflict-warning body from the combined dry-run — pure PRESENTATION of Core's
 *  before/after, never a recompute. Only ever called for Block time off (UNAVAILABLE) days whose
 *  override changes the day's current hours (see `conflict` in `buildDayView`), so the message is
 *  block-framed: it names the current windows and what they become once the block is applied. */
function conflictSentences(conflictDays: DayView[], timeZone: string): string[] {
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
    return `This blocks time on ${day} that overlaps your current hours — ${currently} becomes ${after}.`;
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

interface DateOverrideModalContentProps {
  /** The single day this editor manages (already resolved to a concrete ISO date). */
  date: string;
  /** The day's existing exceptions (both kinds) — seeds the editor and, on Confirm, tells the
   *  reconcile which [kind] rows to delete. The OTHER kind is never touched. */
  dayExceptions: AvailabilityException[];
  onClose: () => void;
}

function DateOverrideModalContent({ date, dayExceptions, onClose }: DateOverrideModalContentProps) {
  const settingsQuery = useAvailabilitySettings();
  const resolvedQuery = useResolvedAvailability();
  const createException = useCreateAvailabilityException();
  const deleteException = useDeleteAvailabilityException();

  const settingsTimezone = settingsQuery.data?.timezone ?? FALLBACK_TIMEZONE;

  // Seed the default kind + its existing slots synchronously from the (already-loaded) day
  // exceptions. The parent loader remounts this component via `key` once the exceptions query
  // resolves, so this lazy state always seeds from loaded data — no state-syncing effect needed.
  const [mode, setMode] = useState<AvailabilityExceptionKind>(() =>
    defaultKindForDay(dayExceptions),
  );
  const [slots, setSlots] = useState<SlotDraft[]>(() =>
    slotsFromExceptions(dayExceptions, defaultKindForDay(dayExceptions)),
  );
  // Key of the just-added slot, so its FROM picker mounts open (mirrors DayHoursModal).
  const [autoOpenKey, setAutoOpenKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Switching the toggle re-loads THAT kind's existing slots (an empty list when the day has none).
  const selectMode = (next: AvailabilityExceptionKind) => {
    if (next === mode) return;
    setMode(next);
    setSlots(slotsFromExceptions(dayExceptions, next));
    setAutoOpenKey(null);
    setError(null);
  };

  const updateSlot = (key: string, patch: Partial<SlotDraft>) =>
    setSlots((prev) => prev.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)));
  const addSlot = () => {
    const key = nextSlotKey();
    setSlots((prev) => [...prev, { key, from: "09:00", to: "10:00" }]);
    setAutoOpenKey(key);
  };
  const removeSlot = (key: string) => setSlots((prev) => prev.filter((slot) => slot.key !== key));
  // "Clear all time slots" — empties every slot of the selected kind at once. Confirm then just
  // deletes the day's existing [kind] exceptions (zero creates).
  const clearAllSlots = () => {
    setSlots([]);
    setAutoOpenKey(null);
    setError(null);
  };

  // Per-slot STRUCTURAL validity (start < end) — shown inline + blocks Confirm. Overlap/trim is
  // never pre-checked here (backend-authoritative → surfaced via the 422 alert or the dry-run).
  const slotErrors = slots.map((slot) => slotStructuralError(slot.from, slot.to));
  const hasStructuralError = slotErrors.some(Boolean);
  // Save is blocked ONLY by a structurally-invalid slot — an EMPTY list is a valid request
  // (clear this day's [kind]), so zero slots does NOT disable Confirm.
  const canConfirm = !hasStructuralError;

  const occurrencesByDate = useMemo(
    () => bucketOccurrencesByDate(resolvedQuery.data?.occurrences ?? [], settingsTimezone),
    [resolvedQuery.data?.occurrences, settingsTimezone],
  );

  // ONE combined dry-run in REPLACE mode — the backend shows the day as if this kind's overrides are
  // replaced by exactly these windows. `replaceExisting: true` keeps the query enabled even with
  // ZERO windows (that = "show the day with this kind cleared"), so edits/removals/clears all
  // preview accurately. Debounced so editing doesn't fire per keystroke.
  const rawMultiParams: OverrideMultiPreviewParams = useMemo(() => {
    const windows: OverrideWindow[] = [];
    for (const slot of slots) {
      const win = safeWindowMin(slot.from, slot.to);
      if (win !== null) windows.push({ startLocal: slot.from, windowMin: win });
    }
    return { dateFrom: date, dateTo: date, kind: mode, windows, replaceExisting: true };
  }, [date, mode, slots]);
  const debouncedMultiParams = useDebounced(rawMultiParams, PREVIEW_DEBOUNCE_MS);
  const previewQuery = useOverrideMultiPreview(debouncedMultiParams);

  const previewDays = previewQuery.data?.days;

  // Per-affected-date view models — ONE Now/After pair per date (net of all slots), built from the
  // debounced params so the rendered kind/proposed windows match the response they produced.
  const dayViews = useMemo<DayView[]>(() => {
    return (previewDays ?? []).map((day) =>
      buildDayView(
        day,
        occurrencesByDate.get(day.date) ?? [],
        debouncedMultiParams.kind,
        debouncedMultiParams.windows,
        settingsTimezone,
      ),
    );
  }, [previewDays, occurrencesByDate, debouncedMultiParams, settingsTimezone]);

  const conflictDays = dayViews.filter((view) => view.conflict);
  const conflictMessages =
    conflictDays.length > 0 ? conflictSentences(conflictDays, settingsTimezone) : [];

  const previewLoading = previewQuery.isLoading || previewQuery.isFetching;

  const handleConfirm = async () => {
    setError(null);

    let windows: OverrideWindow[];
    try {
      windows = slots.map((slot) => ({
        startLocal: slot.from,
        windowMin: toWindowMin(slot.from, slot.to),
      }));
    } catch {
      setError("Enter a valid from–to range for every slot.");
      return;
    }

    setSubmitting(true);
    try {
      // RECONCILE: set the day's [kind] to exactly these slots. First delete every existing [kind]
      // exception for this date (by id), then create one per current slot. Zero slots = delete only.
      // The OTHER kind's exceptions are never touched. This is sequential delete-then-create — a
      // partial failure mid-way is possible (same class as the former per-slot save); it's
      // backend-authoritative and the modal stays open on any 422 to surface the message.
      for (const exc of exceptionsForKind(dayExceptions, mode)) {
        await deleteException.mutateAsync(exc.id);
      }
      for (const win of windows) {
        await createException.mutateAsync({
          dateFrom: date,
          dateTo: date,
          kind: mode,
          startLocal: win.startLocal,
          windowMin: win.windowMin,
        });
      }
      onClose();
    } catch (err) {
      // Keep the modal open (do NOT call onClose) and show the backend message in-modal — Core
      // decides validity/trim; the FE never pre-emptively blocks on overlap/trim.
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
        Date-specific hours · {formatWeekdayMonthDay(date)}
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
        disabled={submitting || !canConfirm}
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
      className="w-full max-w-[min(92vw,40rem)]"
      header={header}
      footer={footer}
    >
      <div className="space-y-5">
        <Alert variant="info" role="status">
          This is a single-day override — it does not change your weekly hours. For recurring
          changes, use Weekly hours.
        </Alert>

        {error ? <Alert variant="error">{error}</Alert> : null}

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
                onClick={() => selectMode(key)}
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

        <div className="space-y-2 rounded-md border border-border bg-card p-3">
          <p className="text-[13px] font-bold text-ink">Time slots for this day</p>
          {slots.length === 0 ? (
            <p className="text-[13px] text-ink-soft">
              No {SEGMENT_LABELS[mode].toLowerCase()} slots for this day — add one below.
            </p>
          ) : (
            slots.map((slot, index) => (
              <div key={slot.key}>
                <div
                  role="group"
                  aria-label={`Time slot ${index + 1}`}
                  className="flex items-center gap-2"
                >
                  <div className="flex-1">
                    <TimePicker
                      aria-label={`Time slot ${index + 1} from`}
                      value={slot.from}
                      openOnMount={slot.key === autoOpenKey}
                      onChange={(next) => updateSlot(slot.key, { from: next })}
                    />
                  </div>
                  <span aria-hidden className="text-ink-soft">
                    –
                  </span>
                  <div className="flex-1">
                    <TimePicker
                      midnightIsEndOfDay
                      aria-label={`Time slot ${index + 1} to`}
                      value={slot.to}
                      onChange={(next) => updateSlot(slot.key, { to: next })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSlot(slot.key)}
                    aria-label={`Remove time slot ${index + 1}`}
                    className="tp-icon-btn"
                  >
                    <Trash2 size={16} strokeWidth={1.8} aria-hidden />
                  </button>
                </div>
                {slotErrors[index] ? (
                  <p role="alert" className="mt-1 text-[12px] font-semibold text-error-foreground">
                    {slotErrors[index]}
                  </p>
                ) : null}
              </div>
            ))
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={addSlot}>
              <Plus size={15} strokeWidth={2} aria-hidden />
              Add time slot
            </Button>
            {slots.length > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearAllSlots}>
                <Trash2 size={15} strokeWidth={2} aria-hidden />
                Clear all time slots
              </Button>
            ) : null}
          </div>
        </div>

        <div
          role="region"
          aria-label="Preview"
          className="rounded-md border border-border bg-card p-3"
        >
          <p className="text-[13px] font-bold text-ink">After applying</p>
          {previewLoading ? (
            <p className="mt-2 text-[13px] text-ink-soft">Loading preview…</p>
          ) : dayViews.length === 0 ? (
            <p className="mt-2 text-[13px] text-ink-soft">No affected dates yet.</p>
          ) : (
            <>
              {conflictMessages.length > 0 ? (
                <Alert variant="warning" role="status" className="mt-3">
                  <ul className="space-y-1">
                    {conflictMessages.map((message, index) => (
                      <li key={index}>{message}</li>
                    ))}
                  </ul>
                  <p className="mt-1 font-medium">Confirm the change?</p>
                </Alert>
              ) : null}
              <ul className="mt-3 space-y-4">
                {dayViews.map((view) => (
                  <li key={view.date} aria-label={`Timeline for ${view.date}`}>
                    <p className="text-[12px] font-semibold text-ink">
                      {formatWeekdayMonthDay(view.date)}
                    </p>
                    {DAY_HALVES.map((half) => {
                      const label = half.key.toUpperCase();
                      return (
                        <div key={half.key} className="mt-2 space-y-1">
                          <TimeAxisBar
                            barLabel="Now"
                            ariaLabel={`Current hours on ${view.date} (${label})`}
                            segments={segmentsInHalf(view.nowSegments, half)}
                            domainStartMin={half.startMin}
                            domainEndMin={half.endMin}
                          />
                          <TimeAxisBar
                            barLabel="After"
                            ariaLabel={`After applying on ${view.date} (${label})`}
                            segments={segmentsInHalf(view.afterSegments, half)}
                            domainStartMin={half.startMin}
                            domainEndMin={half.endMin}
                          />
                          <TimeAxis
                            ticks={halfTicks(half.startMin, half.endMin)}
                            rangeStartMin={half.startMin}
                            rangeEndMin={half.endMin}
                          />
                        </div>
                      );
                    })}
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
 * Date-specific override EDITOR for a SINGLE day (CTL-55) — the modal opens on the clicked
 * `initialDate` and manages exactly that day's overrides (no date range). A two-segment control
 * picks the kind (Add extra = `ADDITIONAL` / Block time off = `UNAVAILABLE`), defaulting to the kind
 * the day already has an override for (UNAVAILABLE wins if both, else UNAVAILABLE). The editable
 * slot list is SEEDED from the day's existing [kind] exceptions (via `useAvailabilityExceptions`),
 * one from–to row per exception — or an EMPTY list when the day has none (no auto-populated default
 * row). Switching the toggle re-loads the other kind's existing slots. Rows are edited/added/removed
 * with the shared `TimePicker`, and "Clear all time slots" empties them all at once.
 *
 * A debounced COMBINED dry-run (`useOverrideMultiPreview`, `replaceExisting: true`) renders the day
 * as ONE time-axis Now/After pair — the NET result if this kind were replaced by exactly the current
 * windows (green = Available, hatched = Time off, blue = Extra), enabled even with ZERO windows (the
 * "After" then shows the day with this kind cleared) — plus an amber conflict warning when a block
 * changes existing hours. All pure presentation of Core's before/after (FE-never-recomputes):
 * "Before" windows come from `useResolvedAvailability` bucketed via `bucketOccurrencesByDate`; the
 * green "after" segments straight from the dry-run's `resultingWindows`; the hatched/blue segments
 * from the user's own `proposed` windows (never `day.trimmed`).
 *
 * Confirm RECONCILES the day's [kind] to exactly these slots: delete every existing [kind] exception
 * for the date (by id), then create one per current slot — zero slots = delete only. The OTHER
 * kind's exceptions are never touched. This is a sequential delete-then-create; a partial failure
 * mid-way is possible (backend-authoritative), and on any 422 the modal stays open with the message.
 *
 * The `key` remount ties the form's seed to `initialDate`; the whole modal (Modal shell + form
 * state) lives in `DateOverrideModalContent` so the structured header/footer share that state.
 */
export function DateOverrideModal({ open, initialDate, onClose }: DateOverrideModalProps) {
  if (!open) return null;
  return <DateOverrideModalLoader initialDate={initialDate} onClose={onClose} />;
}

/**
 * Loads the day's exceptions and hands them to the editor as a plain prop. Remounting the editor
 * (via `key`) when the date changes OR when the exceptions query finishes loading lets the editor
 * seed its `mode`/`slots` synchronously from loaded data — the idiomatic "reset state with key"
 * pattern, so no state-syncing effect is needed inside the editor.
 */
function DateOverrideModalLoader({ initialDate, onClose }: Omit<DateOverrideModalProps, "open">) {
  const exceptionsQuery = useAvailabilityExceptions();
  const date = initialDate ?? todayIsoDate();
  const dayExceptions = useMemo(
    () => (exceptionsQuery.data ?? []).filter((exc) => exc.exceptionDate === date),
    [exceptionsQuery.data, date],
  );
  const seedKey = `${date}::${exceptionsQuery.data === undefined ? "loading" : "loaded"}`;
  return (
    <DateOverrideModalContent
      key={seedKey}
      date={date}
      dayExceptions={dayExceptions}
      onClose={onClose}
    />
  );
}
