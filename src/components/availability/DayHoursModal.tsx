"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Alert, Body, Button, Heading, IconButton, Modal, TimePicker } from "@/components/ui";
import {
  ApiError,
  useReplaceRules,
  type AffectedBooking,
  type AvailabilityRule,
} from "@/lib/data-access";
import { toWindowMin, windowToRawTo } from "@/lib/availability/fromTo";
import { AffectedBookingsNotice } from "./AffectedBookingsNotice";

export interface DayHoursModalProps {
  open: boolean;
  dayOfWeek: number;
  dayLabel: string;
  /** All of this weekday's rules (active AND inactive) — seeds the editor's from–to rows. On Save
   *  the current rows are sent as ONE atomic replace of this weekday's rules; the toggle, not this
   *  modal, owns `active`. */
  rules: AvailabilityRule[];
  settingsTimezone: string;
  onClose: () => void;
}

/** One from–to range being edited. The atomic replace sends the desired end-state windows, so a
 *  range carries no rule id — it is not a 1:1 edit of a specific existing row. */
interface RangeDraft {
  /** Stable React key — the existing rule id, or a locally-minted "new-N" id for an added range. */
  key: string;
  from: string;
  to: string;
}

let draftSeq = 0;
function nextDraftKey(): string {
  draftSeq += 1;
  return `new-${draftSeq}`;
}

function draftsFromRules(rules: AvailabilityRule[]): RangeDraft[] {
  return [...rules]
    .sort((a, b) => a.startLocal.localeCompare(b.startLocal))
    .map((rule) => ({
      key: rule.id,
      from: rule.startLocal,
      // Prefill the controlled `to`-picker value via the RAW helper (not `windowToTo`'s display
      // label, which can't round-trip through `toWindowMin` — see fromTo.ts).
      to: windowToRawTo(rule.startLocal, rule.windowMin),
    }));
}

/** Surfaces the backend's 422 message verbatim (overlap / cross-midnight / re-activate) — this
 *  modal never pre-computes or blocks on conflicts client-side (FE-never-recomputes). */
export function dayHoursErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 422) {
    return err.message || "That range overlaps another one on this day.";
  }
  return "Could not save these hours. Please try again.";
}

/** STRUCTURAL-only per-row check (start must be before end / same-day) via `toWindowMin` — never
 *  overlap/trim, which stays backend-owned. Returns a friendly message (shown inline on the row and
 *  used to block Save) or `null` when the pair is well-formed. Mirrors what the backend also
 *  rejects, so an invalid `from >= to` never reaches a mutation. */
export function structuralRangeError(from: string, to: string): string | null {
  try {
    toWindowMin(from, to);
    return null;
  } catch {
    return "Start time must be before the end time.";
  }
}

function DayHoursModalContent({
  dayOfWeek,
  dayLabel,
  rules,
  settingsTimezone,
  onClose,
}: Omit<DayHoursModalProps, "open">) {
  const replaceRules = useReplaceRules();

  const [ranges, setRanges] = useState<RangeDraft[]>(() => draftsFromRules(rules));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bookings the last successful save overlapped (allow+notify). Non-empty ⇒ keep the modal open
  // and show the notice instead of closing, so the guide is told the change touched real bookings.
  const [affectedBookings, setAffectedBookings] = useState<AffectedBooking[]>([]);
  // Key of the just-added row, so its FROM picker mounts open + focused on the hour.
  const [autoOpenKey, setAutoOpenKey] = useState<string | null>(null);

  const updateRange = (key: string, patch: Partial<RangeDraft>) => {
    setRanges((prev) => prev.map((range) => (range.key === key ? { ...range, ...patch } : range)));
  };

  const addRange = () => {
    const key = nextDraftKey();
    setRanges((prev) => [...prev, { key, from: "09:00", to: "10:00" }]);
    setAutoOpenKey(key);
  };

  const removeRange = (key: string) => {
    setRanges((prev) => prev.filter((range) => range.key !== key));
  };

  // Live STRUCTURAL validity per row (start < end) — shown inline and used to block Save. Overlap
  // is deliberately NOT pre-checked here (backend-authoritative → surfaced via the 422 alert).
  const rangeErrors = ranges.map((range) => structuralRangeError(range.from, range.to));
  const hasStructuralError = rangeErrors.some(Boolean);

  const handleSave = async () => {
    setError(null);
    setAffectedBookings([]);

    // Structural validation only (from < to, same-day) — never overlap/trim, which stays entirely
    // backend-owned. A malformed picker pairing (shouldn't happen via the controlled inputs, but
    // guards against it) surfaces here instead of reaching the mutation below.
    let windows: { startLocal: string; windowMin: number }[];
    try {
      windows = ranges.map((range) => ({
        startLocal: range.from,
        windowMin: toWindowMin(range.from, range.to),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enter a valid from–to range.");
      return;
    }

    setSaving(true);
    try {
      // ATOMIC REPLACE (CTL-55 v2.1 B2): set this weekday's rules to exactly these windows in ONE
      // backend transaction — the source of atomicity is the backend, not a FE create/update/delete
      // reconcile. An EMPTY windows list clears this weekday's rules. A rejection mid-save no longer
      // leaves the weekday partially reconciled, because there is no delete-then-create.
      const { affectedBookings: affected } = await replaceRules.mutateAsync({ dayOfWeek, windows });
      // Allow + notify: the change is already saved. If reducing these hours overlapped existing
      // bookings, keep the modal open and surface them (never auto-cancelled); otherwise close.
      if (affected.length > 0) {
        setAffectedBookings(affected);
      } else {
        onClose();
      }
    } catch (err) {
      // Keep the modal open (do NOT call onClose) and do NOT wipe local edits — show the backend
      // message in-modal so the guide fixes the conflicting range and retries.
      setError(dayHoursErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    // The viewport-capped height + scrollable body now live in `Modal` itself
    // (structured mode, via `header`/`footer`) — this component only supplies
    // the fixed title (header), the fixed Cancel/Save actions (footer), and
    // the scrollable content (children: persistent + error alerts, ranges, ＋Add).
    <Modal
      open
      onClose={onClose}
      labelledBy="day-hours-modal-title"
      className="max-w-lg overflow-hidden"
      // Tighter cap than the 85vh default: the range list can grow long, so hold the
      // panel to 600px (still ≤85vh on short viewports) and scroll the list inside.
      maxHeightClassName="max-h-[min(600px,85vh)]"
      header={
        <>
          <Heading as="h2" id="day-hours-modal-title" size="xlarge">
            Edit {dayLabel} hours
          </Heading>
          <Body size="small" color="muted" className="mt-1">
            Times shown in {settingsTimezone}.
          </Body>
        </>
      }
      footer={
        affectedBookings.length > 0 ? (
          // Post-save notify state: the change is already persisted; the only action left is to
          // acknowledge the affected-bookings notice and close.
          <div className="flex justify-end">
            <Button type="button" variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleSave()}
              disabled={saving || hasStructuralError}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )
      }
    >
      <Alert variant="info" role="status">
        Hours that pass midnight should be added to the next day.
      </Alert>

      {error ? (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      ) : null}

      {affectedBookings.length > 0 ? (
        <div className="mt-3">
          <AffectedBookingsNotice bookings={affectedBookings} timeZone={settingsTimezone} />
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        {ranges.length === 0 ? (
          <Body size="small" color="muted">
            No hours yet — add a time range below.
          </Body>
        ) : (
          ranges.map((range, index) => (
            <div key={range.key}>
              <div
                role="group"
                aria-label={`Range ${index + 1}`}
                className="flex items-center gap-2"
              >
                <div className="flex-1">
                  <TimePicker
                    aria-label={`Range ${index + 1} from`}
                    value={range.from}
                    openOnMount={range.key === autoOpenKey}
                    onChange={(next) => updateRange(range.key, { from: next })}
                  />
                </div>
                <span aria-hidden className="text-ink-soft">
                  –
                </span>
                <div className="flex-1">
                  <TimePicker
                    midnightIsEndOfDay
                    aria-label={`Range ${index + 1} to`}
                    value={range.to}
                    onChange={(next) => updateRange(range.key, { to: next })}
                  />
                </div>
                <IconButton
                  variant="soft"
                  size="small"
                  onClick={() => removeRange(range.key)}
                  a11yLabel={`Remove range ${index + 1}`}
                >
                  <Trash2 size={16} strokeWidth={1.8} aria-hidden />
                </IconButton>
              </div>
              {rangeErrors[index] ? (
                <p role="alert" className="mt-1 text-[12px] font-semibold text-error-foreground">
                  {rangeErrors[index]}
                </p>
              ) : null}
            </div>
          ))
        )}

        <Button type="button" variant="ghost" size="small" onClick={addRange}>
          <Plus size={15} strokeWidth={2} aria-hidden />
          Add time range
        </Button>
      </div>
    </Modal>
  );
}

/**
 * Per-weekday range editor (CTL-55 v2.1) — opened from `WeeklyHoursPanel`'s single Edit button.
 * Lists the weekday's ranges as from–to pickers (＋Add / ×remove); Save sends the current rows as
 * ONE atomic `useReplaceRules().mutateAsync({dayOfWeek, windows})` (windows via `toWindowMin`;
 * empty = clear this weekday) — the backend transaction is the only source of atomicity, so a
 * rejection never partially reconciles. Never touches `active` — that's the panel's toggle's job
 * (deactivate-preserve).
 */
export function DayHoursModal({
  open,
  dayOfWeek,
  dayLabel,
  rules,
  settingsTimezone,
  onClose,
}: DayHoursModalProps) {
  // `DayHoursModalContent` owns the `Modal` call (its header/footer need this content's own
  // save/error state), so it — and the dialog it renders — only mounts while `open`. `Modal`
  // itself still no-ops (returns null + skips its effects) whenever `open` is false, so this is
  // behaviorally identical to the previous always-mounted-`Modal`-with-conditional-children shape.
  if (!open) return null;

  return (
    <DayHoursModalContent
      // Remount when the target day changes (Edit clicked on a different row while the modal
      // was already open) so the form re-seeds from that day's own rules.
      key={dayOfWeek}
      dayOfWeek={dayOfWeek}
      dayLabel={dayLabel}
      rules={rules}
      settingsTimezone={settingsTimezone}
      onClose={onClose}
    />
  );
}
