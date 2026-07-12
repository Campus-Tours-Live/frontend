"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Alert, Button, Modal, TimePicker } from "@/components/ui";
import {
  ApiError,
  useCreateAvailabilityRule,
  useDeleteAvailabilityRule,
  useUpdateAvailabilityRule,
  type AvailabilityRule,
} from "@/lib/data-access";
import { toWindowMin, windowToRawTo } from "@/lib/availability/fromTo";

export interface DayHoursModalProps {
  open: boolean;
  dayOfWeek: number;
  dayLabel: string;
  /** All of this weekday's rules (active AND inactive) — Save reconciles create/update/delete
   *  against this full set, never just the active ones (the toggle, not this modal, owns `active`). */
  rules: AvailabilityRule[];
  settingsTimezone: string;
  onClose: () => void;
}

/** One from–to range being edited. `ruleId` is absent for a not-yet-created range. */
interface RangeDraft {
  /** Stable React key — the existing rule id, or a locally-minted "new-N" id for an added range. */
  key: string;
  ruleId?: string;
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
      ruleId: rule.id,
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
  const createRule = useCreateAvailabilityRule();
  const updateRule = useUpdateAvailabilityRule();
  const deleteRule = useDeleteAvailabilityRule();

  const [ranges, setRanges] = useState<RangeDraft[]>(() => draftsFromRules(rules));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

    // Structural validation only (from < to, same-day) — never overlap/trim, which stays entirely
    // backend-owned. A malformed picker pairing (shouldn't happen via the controlled inputs, but
    // guards against it) surfaces here instead of reaching the mutations below.
    let windows: { ruleId?: string; startLocal: string; windowMin: number }[];
    try {
      windows = ranges.map((range) => ({
        ruleId: range.ruleId,
        startLocal: range.from,
        windowMin: toWindowMin(range.from, range.to),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enter a valid from–to range.");
      return;
    }

    const keptRuleIds = new Set(windows.filter((w) => w.ruleId).map((w) => w.ruleId));
    const toDelete = rules.filter((rule) => !keptRuleIds.has(rule.id));
    const toCreate = windows.filter((w) => !w.ruleId);
    const toUpdate = windows.filter((w) => {
      if (!w.ruleId) return false;
      const original = rules.find((rule) => rule.id === w.ruleId);
      return (
        !original || original.startLocal !== w.startLocal || original.windowMin !== w.windowMin
      );
    });

    setSaving(true);
    try {
      for (const rule of toDelete) {
        await deleteRule.mutateAsync(rule.id);
      }
      for (const w of toUpdate) {
        await updateRule.mutateAsync({
          id: w.ruleId as string,
          body: { startLocal: w.startLocal, windowMin: w.windowMin },
        });
      }
      for (const w of toCreate) {
        await createRule.mutateAsync({
          dayOfWeek,
          startLocal: w.startLocal,
          windowMin: w.windowMin,
        });
      }
      onClose();
    } catch (err) {
      // Keep the modal open (do NOT call onClose) and show the backend message in-modal — the
      // guide fixes the conflicting range without losing their other edits.
      setError(dayHoursErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    // Cap to the viewport (with a comfortable min height) and split into fixed
    // header / scrollable body / fixed footer, so a long list of ranges scrolls
    // inside the modal on any screen size.
    <div className="flex max-h-[85vh] min-h-[min(24rem,80vh)] flex-col p-6">
      <div className="shrink-0">
        <h2 id="day-hours-modal-title" className="font-display text-[24px] font-bold text-ink">
          Edit {dayLabel} hours
        </h2>
        <p className="mt-1 text-[13px] text-ink-soft">Times shown in {settingsTimezone}.</p>

        <Alert variant="info" role="status" className="mt-4">
          Hours that pass midnight should be added to the next day.
        </Alert>

        {error ? (
          <Alert variant="error" className="mt-3">
            {error}
          </Alert>
        ) : null}
      </div>

      <div className="-mr-2 mt-5 flex-1 space-y-4 overflow-y-auto pr-2">
        {ranges.length === 0 ? (
          <p className="text-[13px] text-ink-soft">No hours yet — add a time range below.</p>
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
                <button
                  type="button"
                  onClick={() => removeRange(range.key)}
                  aria-label={`Remove range ${index + 1}`}
                  className="tp-icon-btn"
                >
                  <Trash2 size={16} strokeWidth={1.8} aria-hidden />
                </button>
              </div>
              {rangeErrors[index] ? (
                <p role="alert" className="mt-1 text-[12px] font-semibold text-error-foreground">
                  {rangeErrors[index]}
                </p>
              ) : null}
            </div>
          ))
        )}

        <Button type="button" variant="ghost" size="sm" onClick={addRange}>
          <Plus size={15} strokeWidth={2} aria-hidden />
          Add time range
        </Button>
      </div>

      <div className="mt-6 flex shrink-0 justify-end gap-3">
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
    </div>
  );
}

/**
 * Per-weekday range editor (CTL-55 v2.1) — opened from `WeeklyHoursPanel`'s single Edit button.
 * Lists the weekday's ranges as from–to pickers (＋Add / ×remove); Save reconciles
 * create/update/delete to match, submitting `{dayOfWeek, startLocal, windowMin}` via
 * `toWindowMin`. Never touches `active` — that's the panel's toggle's job (deactivate-preserve).
 */
export function DayHoursModal({
  open,
  dayOfWeek,
  dayLabel,
  rules,
  settingsTimezone,
  onClose,
}: DayHoursModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="day-hours-modal-title"
      className="max-w-lg overflow-hidden"
    >
      {open ? (
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
      ) : null}
    </Modal>
  );
}
