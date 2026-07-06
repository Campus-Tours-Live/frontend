"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Button, Modal, SelectField, TextField, Textarea } from "@/components/ui";
import {
  ApiError,
  apiErrorMessage,
  type AvailabilityException,
  type AvailabilityExceptionType,
} from "@/lib/data-access";
import { parseRuleTimeRangeForSubmit } from "@/lib/availability/submitTimeRange";
import { defaultEndTime, defaultStartTime, snapToTimeGrid } from "@/lib/availability/timeOptions";
import { EXCEPTION_TYPE_LABELS, todayIsoDate } from "./availabilityHelpers";
import { TimeRangeSelect } from "./TimeRangeSelect";

export interface ExceptionFormValues {
  exceptionDate: string;
  type: AvailabilityExceptionType;
  startLocal: string;
  endLocal: string;
  reason: string;
}

interface ExceptionFormFields {
  exceptionDate: string;
  reason: string;
}

interface ExceptionFormModalProps {
  open: boolean;
  onClose: () => void;
  initial?: AvailabilityException | null;
  onSubmit: (values: ExceptionFormValues) => Promise<void>;
  submitting?: boolean;
  error?: string | null;
}

function ExceptionFormModalContent({
  onClose,
  initial,
  onSubmit,
  submitting,
  error,
}: Omit<ExceptionFormModalProps, "open">) {
  const [exceptionType, setExceptionType] = useState<AvailabilityExceptionType>(
    initial?.type ?? "UNAVAILABLE_ALL_DAY",
  );
  const [startLocal, setStartLocal] = useState(
    snapToTimeGrid(initial?.startLocal ?? defaultStartTime()),
  );
  const [endLocal, setEndLocal] = useState(snapToTimeGrid(initial?.endLocal ?? defaultEndTime()));
  const [timeError, setTimeError] = useState<string | null>(null);

  const showTimes = exceptionType !== "UNAVAILABLE_ALL_DAY";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExceptionFormFields>({
    defaultValues: {
      exceptionDate: initial?.exceptionDate ?? todayIsoDate(),
      reason: initial?.reason ?? "",
    },
  });

  return (
    <form
      className="p-6"
      onSubmit={handleSubmit(async (fields) => {
        setTimeError(null);

        let times: { startLocal: string; endLocal: string } | null = null;
        if (showTimes) {
          times = parseRuleTimeRangeForSubmit(startLocal, endLocal);
          if (!times) {
            setTimeError("End time must be after start time on the same day.");
            return;
          }
        }

        const values: ExceptionFormValues = {
          exceptionDate: fields.exceptionDate,
          type: exceptionType,
          startLocal: times?.startLocal ?? defaultStartTime(),
          endLocal: times?.endLocal ?? defaultEndTime(),
          reason: fields.reason,
        };

        try {
          await onSubmit(values);
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
        Override your weekly schedule for a single date. Times use 15-minute increments.
      </p>

      {error ? (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      ) : null}

      <div className="mt-5 space-y-4">
        <TextField
          label="Date"
          type="date"
          error={errors.exceptionDate?.message}
          {...register("exceptionDate", { required: "Date is required" })}
        />

        <SelectField
          label="Exception type"
          value={exceptionType}
          onChange={(event) => setExceptionType(event.target.value as AvailabilityExceptionType)}
        >
          {(Object.keys(EXCEPTION_TYPE_LABELS) as AvailabilityExceptionType[]).map((value) => (
            <option key={value} value={value}>
              {EXCEPTION_TYPE_LABELS[value]}
            </option>
          ))}
        </SelectField>

        {showTimes ? (
          <TimeRangeSelect
            startLocal={startLocal}
            endLocal={endLocal}
            onStartLocalChange={setStartLocal}
            onEndLocalChange={setEndLocal}
            startError={timeError ?? undefined}
            endError={timeError ?? undefined}
          />
        ) : null}

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
    return (
      apiErrorMessage(err) || "Could not save the exception. Please check your input and try again."
    );
  }
  return "Could not save the exception. Please try again.";
}
