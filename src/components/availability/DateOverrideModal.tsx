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
  type OverridePreviewParams,
} from "@/lib/data-access";
import { buildToOptions, formatFromTo, toWindowMin } from "@/lib/availability/fromTo";
import { bucketOccurrencesByDate } from "@/lib/availability/bucketByDate";
import { useDebounced } from "@/hooks";
import { todayIsoDate } from "./availabilityHelpers";

const FALLBACK_TIMEZONE = "America/Los_Angeles";

/** Debounce delay (ms) between the last form edit and firing the dry-run preview request —
 *  keeps the guide from triggering a network round-trip on every keystroke. */
const PREVIEW_DEBOUNCE_MS = 400;

const MODE_LABELS: Record<AvailabilityExceptionKind, string> = {
  ADDITIONAL: "Add extra availability",
  UNAVAILABLE: "Block time off",
};

export interface DateOverrideModalProps {
  open: boolean;
  onClose: () => void;
  /** Prefills `dateFrom`/`dateTo` — e.g. the ISO date clicked in `MonthAvailabilityView`'s
   *  `onOpenOverride`. Defaults to today when omitted. */
  initialDate?: string | null;
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

  const previewDays = previewQuery.data?.days ?? [];

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

  return (
    <div className="p-6">
      <h2 id="date-override-modal-title" className="font-display text-[24px] font-bold text-ink">
        {MODE_LABELS[mode]}
      </h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        Override your weekly schedule for one or more dates. Times shown in {settingsTimezone}.
      </p>

      <Alert variant="info" role="status" className="mt-4">
        This is a single-day override — it does NOT change your weekly hours.
      </Alert>

      {error ? (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      ) : null}

      <div className="mt-5 space-y-4">
        <div role="group" aria-label="Override type" className="flex gap-2">
          {(Object.keys(MODE_LABELS) as AvailabilityExceptionKind[]).map((key) => (
            <Button
              key={key}
              type="button"
              variant={mode === key ? "primary" : "ghost"}
              aria-pressed={mode === key}
              onClick={() => setMode(key)}
            >
              {MODE_LABELS[key]}
            </Button>
          ))}
        </div>

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

        <div
          role="region"
          aria-label="Preview"
          className="rounded-md border border-border bg-card p-3 text-[13px]"
        >
          {debouncedPreviewParams === null ? (
            <p className="text-ink-soft">
              Enter a valid date range and from–to time to see a preview.
            </p>
          ) : previewQuery.isLoading || previewQuery.isFetching ? (
            <p className="text-ink-soft">Loading preview…</p>
          ) : previewDays.length === 0 ? (
            <p className="text-ink-soft">No affected dates yet.</p>
          ) : (
            <ul className="space-y-4">
              {previewDays.map((day) => {
                const before = occurrencesByDate.get(day.date) ?? [];
                return (
                  <li key={day.date}>
                    <p className="font-semibold text-ink">{day.date}</p>

                    <div className="mt-1">
                      <p className="font-medium text-ink-soft">Before</p>
                      {before.length === 0 ? (
                        <p className="text-ink-soft">No availability.</p>
                      ) : (
                        <ul aria-label={`Before on ${day.date}`}>
                          {before.map((window, index) => (
                            <li key={index} className="text-ink">
                              {formatOccurrence(window, settingsTimezone)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="mt-1">
                      <p className="font-medium text-ink-soft">After</p>
                      {day.resultingWindows.length === 0 ? (
                        <p className="text-ink-soft">No availability.</p>
                      ) : (
                        <ul aria-label={`After on ${day.date}`}>
                          {day.resultingWindows.map((window, index) => (
                            <li key={index} className="text-ink">
                              {formatOccurrence(window, settingsTimezone)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {day.trimmed.length > 0 ? (
                      <div className="mt-1">
                        <p className="font-medium text-ink-soft">Will trim</p>
                        <ul aria-label={`Trimmed on ${day.date}`}>
                          {day.trimmed.map((trimmed, index) => (
                            <li key={index} className="text-ink">
                              {formatFromTo(trimmed.startLocal, trimmed.windowMin)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => void handleConfirm()}
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Confirm"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Shared date-specific override modal (CTL-55 v2.1) — Block time off (`UNAVAILABLE`) / Add extra
 * availability (`ADDITIONAL`), multi-day date range, same-day from–to time. Renders a dry-run
 * before/after preview (`useOverridePreview`, debounced): "before" = that date's current net
 * windows from `useResolvedAvailability`, bucketed via the shared `bucketOccurrencesByDate`
 * (Part A) and formatted in settings tz; "after"/"trimmed" come straight from the preview
 * response. Confirm calls `useCreateAvailabilityException` with the multi-day input; on a
 * backend 422 the modal stays open and shows the backend message (Core decides
 * validity/trim — the FE never pre-computes overlap/trim/net-availability).
 */
export function DateOverrideModal({ open, initialDate, onClose }: DateOverrideModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="date-override-modal-title"
      className="max-w-lg overflow-hidden"
    >
      {open ? (
        <DateOverrideModalContent
          // Remount when the target date changes so the form re-seeds from that date.
          key={initialDate ?? "new"}
          initialDate={initialDate}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}
