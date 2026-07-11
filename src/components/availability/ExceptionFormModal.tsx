"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Button, Modal, SelectField, TextField, Textarea } from "@/components/ui";
import {
  ApiError,
  type AvailabilityException,
  type AvailabilityExceptionKind,
  type CreateAvailabilityExceptionInput,
} from "@/lib/data-access";
import { minutesToPresetValue, presetValueToMinutes } from "@/lib/availability/duration";
import { todayIsoDate } from "./availabilityHelpers";
import { DurationField } from "./DurationField";

/**
 * Values submitted by the exception form — the Task-1 `CreateAvailabilityExceptionInput` shape
 * exactly. There is no separate end-time field; same start+duration model as the rule form.
 */
export type ExceptionFormValues = CreateAvailabilityExceptionInput;

interface ExceptionFormFields {
  exceptionDate: string;
  kind: AvailabilityExceptionKind;
  startLocal: string;
  reason: string;
}

export const EXCEPTION_KIND_LABELS: Record<AvailabilityExceptionKind, string> = {
  UNAVAILABLE: "Unavailable (block time off)",
  ADDITIONAL: "Extra availability",
};

interface ExceptionFormModalProps {
  open: boolean;
  onClose: () => void;
  initial?: AvailabilityException | null;
  onSubmit: (values: ExceptionFormValues) => Promise<void>;
  submitting?: boolean;
  error?: string | null;
}

const DEFAULT_START_LOCAL = "09:00";
const DEFAULT_DURATION_PRESET = "60";

function ExceptionFormModalContent({
  onClose,
  initial,
  onSubmit,
  submitting,
  error,
}: Omit<ExceptionFormModalProps, "open">) {
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
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExceptionFormFields>({
    defaultValues: {
      exceptionDate: initial?.exceptionDate ?? todayIsoDate(),
      kind: initial?.kind ?? "UNAVAILABLE",
      startLocal: initial?.startLocal ?? DEFAULT_START_LOCAL,
      reason: initial?.reason ?? "",
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

        const payload: ExceptionFormValues = {
          exceptionDate: fields.exceptionDate,
          kind: fields.kind,
          startLocal: fields.startLocal,
          windowMin,
          reason: fields.reason.trim() || null,
        };

        try {
          await onSubmit(payload);
          onClose();
        } catch {
          /* surfaced via error prop */
        }
      })}
    >
      <h2 id="exception-modal-title" className="font-display text-[24px] font-bold text-ink">
        {initial ? "Edit date-specific hours" : "Add date-specific hours"}
      </h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        Override your weekly schedule for a single date with a start time and duration.
      </p>

      {error ? (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      ) : null}

      <div className="mt-5 space-y-4">
        {/*
          CTL-55 Task 5 — invalid-date handling parity with RuleFormModal's effectiveFrom/To
          (which use `UsDateField`'s `Controller` `rules.validate` to reject unparsable text and
          show "Use MM/DD/YYYY format"): a native `type="date"` input can never hold a malformed,
          non-empty value in the first place — per the HTML value-sanitization algorithm, the
          browser (verified: jsdom implements this too) resets any unparsable input straight to
          `""`. So an invalid/garbled date and an emptied date both land on the same `""` value,
          which the existing `required` rule below already catches with a visible field error and
          blocks submit. Parity holds without an extra `setError`/validate rule here — see
          ExceptionFormModal.test.tsx's "invalid exceptionDate" / "emptied exceptionDate" tests.
        */}
        <TextField
          label="Date"
          type="date"
          error={errors.exceptionDate?.message}
          {...register("exceptionDate", { required: "Date is required" })}
        />

        <SelectField label="Exception type" error={errors.kind?.message} {...register("kind")}>
          {(Object.keys(EXCEPTION_KIND_LABELS) as AvailabilityExceptionKind[]).map((value) => (
            <option key={value} value={value}>
              {EXCEPTION_KIND_LABELS[value]}
            </option>
          ))}
        </SelectField>

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

        <Textarea label="Reason" optional rows={3} {...register("reason")} />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : initial ? "Save changes" : "Add exception"}
        </Button>
      </div>
    </form>
  );
}

export function ExceptionFormModal({
  open,
  onClose,
  initial,
  onSubmit,
  submitting,
  error,
}: ExceptionFormModalProps) {
  const formKey = initial?.id ?? "new";

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="exception-modal-title"
      className="max-w-lg overflow-hidden"
    >
      {open ? (
        <ExceptionFormModalContent
          key={formKey}
          onClose={onClose}
          initial={initial}
          onSubmit={onSubmit}
          submitting={submitting}
          error={error}
        />
      ) : null}
    </Modal>
  );
}

export function exceptionFormErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 422) {
    return err.message || "This exception overlaps another entry on the same date.";
  }
  return "Could not save the exception. Please try again.";
}
