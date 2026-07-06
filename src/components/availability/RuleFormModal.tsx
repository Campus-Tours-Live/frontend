"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Button, Modal, SelectField, TextField } from "@/components/ui";
import { ApiError, type AvailabilityRule } from "@/lib/data-access";
import { normalizeIsoDateInput } from "@/lib/availability/formatDate";
import { parseRuleTimeRangeForSubmit } from "@/lib/availability/submitTimeRange";
import {
  defaultEndTime,
  defaultStartTime,
  normalizeRuleTimeRange,
  snapToTimeGrid,
} from "@/lib/availability/timeOptions";
import { DAY_LABELS, todayIsoDate } from "./availabilityHelpers";
import { TimeRangeSelect } from "./TimeRangeSelect";
import { UsDateField } from "./UsDateField";

export interface RuleFormValues {
  dayOfWeek: string;
  startLocal: string;
  endLocal: string;
  effectiveFrom: string;
  effectiveTo: string;
  timezone: string;
}

interface RuleFormFields {
  dayOfWeek: string;
  effectiveFrom: string;
  effectiveTo: string;
  timezone: string;
}

interface RuleFormModalProps {
  open: boolean;
  onClose: () => void;
  timezone: string;
  initial?: AvailabilityRule | null;
  defaultDayOfWeek?: number;
  onSubmit: (values: RuleFormValues) => Promise<void>;
  submitting?: boolean;
  error?: string | null;
}

function buildRuleTimeState(initial?: AvailabilityRule | null) {
  const nextStart = snapToTimeGrid(initial?.startLocal ?? defaultStartTime());
  const nextEnd = snapToTimeGrid(initial?.endLocal ?? defaultEndTime());
  const normalized = normalizeRuleTimeRange(nextStart, nextEnd);
  return {
    startLocal: normalized?.startLocal ?? nextStart,
    endLocal: normalized?.endLocal ?? nextEnd,
  };
}

function RuleFormModalContent({
  onClose,
  timezone,
  initial,
  defaultDayOfWeek,
  onSubmit,
  submitting,
  error,
}: Omit<RuleFormModalProps, "open">) {
  const initialTimes = buildRuleTimeState(initial);
  const [startLocal, setStartLocal] = useState(initialTimes.startLocal);
  const [endLocal, setEndLocal] = useState(initialTimes.endLocal);
  const [timeError, setTimeError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RuleFormFields>({
    defaultValues: {
      dayOfWeek: String(initial?.dayOfWeek ?? defaultDayOfWeek ?? 1),
      effectiveFrom: initial?.effectiveFrom ?? todayIsoDate(),
      effectiveTo: initial?.effectiveTo ?? "",
      timezone: initial?.timezone ?? timezone,
    },
  });

  return (
    <form
      className="p-6"
      onSubmit={handleSubmit(async (fields) => {
        setTimeError(null);
        const times = parseRuleTimeRangeForSubmit(startLocal, endLocal);
        if (!times) {
          const message = "End time must be after start time on the same day.";
          setTimeError(message);
          return;
        }

        const effectiveFrom = normalizeIsoDateInput(fields.effectiveFrom);
        if (!effectiveFrom) {
          setError("effectiveFrom", { message: "Use MM/DD/YYYY format" });
          return;
        }
        const effectiveToRaw = fields.effectiveTo.trim();
        let effectiveTo = "";
        if (effectiveToRaw) {
          const parsed = normalizeIsoDateInput(effectiveToRaw);
          if (!parsed) {
            setError("effectiveTo", { message: "Use MM/DD/YYYY format" });
            return;
          }
          effectiveTo = parsed;
        }

        const payload: RuleFormValues = {
          dayOfWeek: fields.dayOfWeek,
          startLocal: times.startLocal,
          endLocal: times.endLocal,
          effectiveFrom,
          effectiveTo,
          timezone: fields.timezone.trim() || timezone,
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
        Choose times in 15-minute steps, same as Calendly. End must be later the same day.
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

        <TimeRangeSelect
          startLocal={startLocal}
          endLocal={endLocal}
          onStartLocalChange={setStartLocal}
          onEndLocalChange={setEndLocal}
          startError={timeError ?? undefined}
          endError={timeError ?? undefined}
        />

        <TextField
          label="Timezone"
          hint="IANA timezone, e.g. America/Los_Angeles"
          {...register("timezone")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <UsDateField
            control={control}
            name="effectiveFrom"
            label="Effective from"
            error={errors.effectiveFrom?.message}
            requiredMessage="Effective from is required"
          />
          <UsDateField
            control={control}
            name="effectiveTo"
            label="Effective to"
            optional
            error={errors.effectiveTo?.message}
          />
        </div>
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
  timezone,
  initial,
  defaultDayOfWeek,
  onSubmit,
  submitting,
  error,
}: RuleFormModalProps) {
  const formKey = initial?.id ?? `new-${defaultDayOfWeek ?? "any"}`;

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg overflow-hidden">
      {open ? (
        <RuleFormModalContent
          key={formKey}
          onClose={onClose}
          timezone={timezone}
          initial={initial}
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
      return (
        err.message ||
        "End time must be after start time, and blocks cannot overlap on the same day."
      );
    }
    if (err.status === 500) {
      return "Could not save recurring hours. Please check that end time is after start time.";
    }
  }
  return "Could not save recurring hours. Please try again.";
}
