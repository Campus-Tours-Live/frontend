"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Alert, Button, Modal, SelectField, TextField } from "@/components/ui";
import {
  ApiError,
  useCreateAvailabilityRule,
  useDeleteAvailabilityRule,
  useUpdateAvailabilityRule,
  type AvailabilityRule,
} from "@/lib/data-access";
import { toWindowMin, windowToRawTo, windowToTo } from "@/lib/availability/fromTo";

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

function minutesFromHHmm(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

const TO_OPTION_MINUTES = [0, 15, 30, 45];

/**
 * The `to`-picker's options: a 15-minute grid across the day, PLUS the midnight sentinel
 * `"24:00"` (required — otherwise a guide can never reach end-of-day), labelled
 * `"12:00 AM (midnight)"` so it doesn't read as the ambiguous start-of-day `"00:00"`. `current` is
 * folded into the grid so an existing (possibly off-grid) rule's `to` always has a matching
 * `<option>` to prefill against.
 */
function buildToOptions(current: string): { value: string; label: string }[] {
  const gridValues = new Set<string>();
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of TO_OPTION_MINUTES) {
      gridValues.add(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  if (current !== "24:00") gridValues.add(current);

  const options = Array.from(gridValues)
    .sort()
    .map((value) => ({ value, label: windowToTo("00:00", minutesFromHHmm(value)) }));
  options.push({ value: "24:00", label: "12:00 AM (midnight)" });
  return options;
}

/** Surfaces the backend's 422 message verbatim (overlap / cross-midnight / re-activate) — this
 *  modal never pre-computes or blocks on conflicts client-side (FE-never-recomputes). */
export function dayHoursErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 422) {
    return err.message || "That range overlaps another one on this day.";
  }
  return "Could not save these hours. Please try again.";
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

  const updateRange = (key: string, patch: Partial<RangeDraft>) => {
    setRanges((prev) => prev.map((range) => (range.key === key ? { ...range, ...patch } : range)));
  };

  const addRange = () => {
    setRanges((prev) => [...prev, { key: nextDraftKey(), from: "09:00", to: "10:00" }]);
  };

  const removeRange = (key: string) => {
    setRanges((prev) => prev.filter((range) => range.key !== key));
  };

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
    <div className="p-6">
      <h2 id="day-hours-modal-title" className="font-display text-[24px] font-bold text-ink">
        Edit {dayLabel} hours
      </h2>
      <p className="mt-1 text-[13px] text-ink-soft">Times shown in {settingsTimezone}.</p>

      {error ? (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      ) : null}

      <div className="mt-5 space-y-4">
        {ranges.length === 0 ? (
          <p className="text-[13px] text-ink-soft">No hours yet — add a range below.</p>
        ) : (
          ranges.map((range, index) => (
            <div
              key={range.key}
              role="group"
              aria-label={`Range ${index + 1}`}
              className="flex items-end gap-2"
            >
              <TextField
                label="From"
                type="time"
                value={range.from}
                onChange={(event) => updateRange(range.key, { from: event.target.value })}
              />
              <SelectField
                label="To"
                value={range.to}
                onChange={(event) => updateRange(range.key, { to: event.target.value })}
              >
                {buildToOptions(range.to).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <button
                type="button"
                onClick={() => removeRange(range.key)}
                aria-label={`Remove range ${index + 1}`}
                className="mb-[9px] rounded p-1.5 text-ink-soft hover:bg-error-soft hover:text-error-foreground"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          ))
        )}

        <Button type="button" variant="ghost" size="sm" onClick={addRange}>
          + Add range
        </Button>

        <p className="text-[12px] text-ink-soft">
          To offer hours past midnight, add a range on the next day.
        </p>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" variant="primary" onClick={() => void handleSave()} disabled={saving}>
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
