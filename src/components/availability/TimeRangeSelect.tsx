"use client";

import { useEffect, useMemo } from "react";
import { SelectField } from "@/components/ui";
import {
  START_TIME_OPTIONS,
  coerceEndTimeAfterStart,
  endTimeOptionsAfter,
  normalizeTimeValue,
} from "@/lib/availability/timeOptions";

export interface TimeRangeSelectProps {
  startLocal: string;
  endLocal: string;
  onStartLocalChange: (value: string) => void;
  onEndLocalChange: (value: string) => void;
  startError?: string;
  endError?: string;
}

/**
 * Calendly-style start/end pickers — 15-minute increments, end options only after start.
 * Uses plain React state (not react-hook-form) so the submitted values match the UI.
 */
export function TimeRangeSelect({
  startLocal,
  endLocal,
  onStartLocalChange,
  onEndLocalChange,
  startError,
  endError,
}: TimeRangeSelectProps) {
  const startValue = normalizeTimeValue(startLocal);
  const endValue = normalizeTimeValue(endLocal);

  const endOptions = useMemo(
    () => (startValue ? endTimeOptionsAfter(startValue) : []),
    [startValue],
  );

  useEffect(() => {
    if (!startValue) return;
    if (!endValue) {
      const nextEnd = coerceEndTimeAfterStart(startValue, "");
      if (nextEnd) {
        onEndLocalChange(nextEnd);
      }
      return;
    }
    const isValid = endOptions.some((option) => option.value === endValue);
    if (!isValid) {
      const coerced = coerceEndTimeAfterStart(startValue, endValue);
      if (coerced && coerced !== endValue) {
        onEndLocalChange(coerced);
      }
    }
  }, [startValue, endValue, endOptions, onEndLocalChange]);

  const noEndOptions = Boolean(startValue) && endOptions.length === 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField
        label="Start time"
        name="startLocal"
        error={startError}
        value={startValue}
        onChange={(event) => {
          const nextStart = event.target.value;
          onStartLocalChange(nextStart);
          const coercedEnd = coerceEndTimeAfterStart(nextStart, endValue);
          if (coercedEnd && coercedEnd !== endValue) {
            onEndLocalChange(coercedEnd);
          }
        }}
      >
        {START_TIME_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="End time"
        name="endLocal"
        error={endError ?? (noEndOptions ? "Choose an earlier start time" : undefined)}
        value={endValue}
        onChange={(event) => {
          onEndLocalChange(event.target.value);
        }}
        disabled={noEndOptions || endOptions.length === 0}
      >
        {endOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
    </div>
  );
}
