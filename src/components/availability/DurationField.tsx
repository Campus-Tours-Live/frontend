"use client";

import { SelectField, TextField } from "@/components/ui";
import { CUSTOM_DURATION_VALUE, DURATION_PRESETS } from "@/lib/availability/duration";

export interface DurationFieldProps {
  /** Selected preset id, or `"custom"`. */
  value: string;
  onValueChange: (value: string) => void;
  /** Raw text of the custom-minutes input; only rendered/used when `value === "custom"`. */
  customMinutes: string;
  onCustomMinutesChange: (value: string) => void;
  error?: string;
  label?: string;
}

/**
 * Duration picker for the availability WINDOW length (`windowMin`) — **not** the tour-length
 * (`durationsOffered`) picker. Presets cover common window lengths; "Custom…" reveals a plain
 * minutes input. No end-of-day sentinel, no snapping — the value maps straight to `windowMin`.
 */
export function DurationField({
  value,
  onValueChange,
  customMinutes,
  onCustomMinutesChange,
  error,
  label = "Availability window",
}: DurationFieldProps) {
  const isCustom = value === CUSTOM_DURATION_VALUE;

  return (
    <div className="space-y-3">
      <SelectField
        label={label}
        hint="How long this block of availability lasts (not the tour length)."
        error={!isCustom ? error : undefined}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      >
        {DURATION_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
        <option value={CUSTOM_DURATION_VALUE}>Custom…</option>
      </SelectField>

      {isCustom ? (
        <TextField
          label="Custom minutes"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={customMinutes}
          onChange={(event) => onCustomMinutesChange(event.target.value)}
          error={error}
        />
      ) : null}
    </div>
  );
}
