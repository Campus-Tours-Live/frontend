"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Button, Modal, SelectField, TextField } from "@/components/ui";
import {
  ApiError,
  type AvailabilityRule,
  type CreateAvailabilityRuleInput,
} from "@/lib/data-access";
import { normalizeIsoDateInput } from "@/lib/availability/formatDate";
import { minutesToPresetValue, presetValueToMinutes } from "@/lib/availability/duration";
import { formatTimezoneLabel, isValidTimezone } from "@/lib/availability/timezones";
import { DAY_LABELS } from "./availabilityHelpers";
import { DurationField } from "./DurationField";
import { UsDateField } from "./UsDateField";

/**
 * Values submitted by the rule form — the Task-1 `CreateAvailabilityRuleInput` shape exactly.
 * There is no separate end-time field and no free-text zone field (the zone is
 * read-only/settings-derived — CTL-55 Task 3).
 */
export type RuleFormValues = CreateAvailabilityRuleInput;

interface RuleFormFields {
  dayOfWeek: string;
  startLocal: string;
  effectiveFrom: string;
  effectiveTo: string;
  active: boolean;
}

interface RuleFormModalProps {
  open: boolean;
  onClose: () => void;
  initial?: AvailabilityRule | null;
  defaultDayOfWeek?: number;
  /**
   * The guide's booking-settings timezone (server-set, single value for all their
   * availability — CTL-55 Task 1/2). Rendered read-only in this form: the guide can see which
   * zone their availability is in, but cannot edit it here, and it is never part of the
   * submitted payload. Task 4 wires this from `useAvailabilitySettings()`'s `timezone`.
   */
  settingsTimezone: string;
  onSubmit: (values: RuleFormValues) => Promise<void>;
  submitting?: boolean;
  error?: string | null;
}

const DEFAULT_START_LOCAL = "09:00";
const DEFAULT_DURATION_PRESET = "60";

function RuleFormModalContent({
  onClose,
  initial,
  defaultDayOfWeek,
  settingsTimezone,
  onSubmit,
  submitting,
  error,
}: Omit<RuleFormModalProps, "open">) {
  // The rule's own stored zone may be an alias (e.g. "US/Pacific") or simply differ from the
  // current settings zone (the guide changed their settings after this rule was created). It is
  // display-only here — never submitted, and never blocks saving. Guard the note with
  // `isValidTimezone` so a corrupt/garbage stored value doesn't render a confusing label.
  const storedTimezoneNote =
    initial?.timezone && initial.timezone !== settingsTimezone && isValidTimezone(initial.timezone)
      ? `Saved with ${formatTimezoneLabel(initial.timezone)} at the time — now shown in your current booking-settings timezone.`
      : null;

  const [durationValue, setDurationValue] = useState(() =>
    initial ? minutesToPresetValue(initial.windowMin) : DEFAULT_DURATION_PRESET,
  );
  const [customMinutes, setCustomMinutes] = useState(() =>
    initial && minutesToPresetValue(initial.windowMin) === "custom"
      ? String(initial.windowMin)
      : "",
  );
  const [durationError, setDurationError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RuleFormFields>({
    defaultValues: {
      dayOfWeek: String(initial?.dayOfWeek ?? defaultDayOfWeek ?? 1),
      startLocal: initial?.startLocal ?? DEFAULT_START_LOCAL,
      effectiveFrom: initial?.effectiveFrom ?? "",
      effectiveTo: initial?.effectiveTo ?? "",
      active: initial?.active ?? true,
    },
  });

  return (
    <form
      className="p-6"
      onSubmit={handleSubmit(async (fields) => {
        setDurationError(null);

        const windowMin = presetValueToMinutes(durationValue, customMinutes);
        if (!windowMin) {
          setDurationError("Enter a valid duration in minutes.");
          return;
        }

        // UsDateField's own Controller validation (see `rules.validate` there) already blocks
        // handleSubmit from reaching this callback with an unparsable, non-empty date — so by the
        // time we're here, each field is either empty or normalizes cleanly.
        const effectiveFromRaw = fields.effectiveFrom.trim();
        const effectiveFrom = effectiveFromRaw ? normalizeIsoDateInput(effectiveFromRaw) : null;

        const effectiveToRaw = fields.effectiveTo.trim();
        const effectiveTo = effectiveToRaw ? normalizeIsoDateInput(effectiveToRaw) : null;

        const payload: RuleFormValues = {
          dayOfWeek: Number(fields.dayOfWeek),
          startLocal: fields.startLocal,
          windowMin,
          effectiveFrom,
          effectiveTo,
          active: fields.active,
        };

        try {
          await onSubmit(payload);
          onClose();
        } catch {
          /* surfaced via error prop */
        }
      })}
    >
      <h2 id="rule-modal-title" className="font-display text-[24px] font-bold text-ink">
        {initial
          ? "Edit hours"
          : `Add hours${defaultDayOfWeek != null ? ` · ${DAY_LABELS[defaultDayOfWeek]}` : ""}`}
      </h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        Set a start time and how long this availability window lasts.
      </p>

      {error ? (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      ) : null}

      <div className="mt-5 space-y-4">
        {defaultDayOfWeek != null && !initial ? (
          <input type="hidden" {...register("dayOfWeek")} />
        ) : (
          <SelectField label="Weekday" error={errors.dayOfWeek?.message} {...register("dayOfWeek")}>
            {DAY_LABELS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </SelectField>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Start time"
            type="time"
            error={errors.startLocal?.message}
            {...register("startLocal", { required: "Start time is required" })}
          />

          <DurationField
            value={durationValue}
            onValueChange={setDurationValue}
            customMinutes={customMinutes}
            onCustomMinutesChange={setCustomMinutes}
            error={durationError ?? undefined}
          />
        </div>

        <TextField
          label="Timezone"
          value={settingsTimezone}
          disabled
          readOnly
          hint={storedTimezoneNote ?? "Set in your booking settings"}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <UsDateField
            control={control}
            name="effectiveFrom"
            label="Effective from"
            optional
            error={errors.effectiveFrom?.message}
          />
          <UsDateField
            control={control}
            name="effectiveTo"
            label="Effective to"
            optional
            error={errors.effectiveTo?.message}
          />
        </div>

        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input type="checkbox" {...register("active")} />
          Active
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : initial ? "Save changes" : "Add hours"}
        </Button>
      </div>
    </form>
  );
}

export function RuleFormModal({
  open,
  onClose,
  initial,
  defaultDayOfWeek,
  settingsTimezone,
  onSubmit,
  submitting,
  error,
}: RuleFormModalProps) {
  const formKey = initial?.id ?? `new-${defaultDayOfWeek ?? "any"}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="rule-modal-title"
      className="max-w-lg overflow-hidden"
    >
      {open ? (
        <RuleFormModalContent
          key={formKey}
          onClose={onClose}
          initial={initial}
          settingsTimezone={settingsTimezone}
          defaultDayOfWeek={defaultDayOfWeek}
          onSubmit={onSubmit}
          submitting={submitting}
          error={error}
        />
      ) : null}
    </Modal>
  );
}

export function ruleFormErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 422) {
      return err.message || "This availability window overlaps another rule on the same day.";
    }
    if (err.status === 500) {
      return "Could not save recurring hours. Please try again.";
    }
  }
  return "Could not save recurring hours. Please try again.";
}
