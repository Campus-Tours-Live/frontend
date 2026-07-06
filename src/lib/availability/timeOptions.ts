import { formatLocalTime } from "./formatTime";

export const TIME_SLOT_MINUTES = 15;

export interface TimeOption {
  value: string;
  label: string;
}

/** Normalize API / input values to HH:mm (15-min grid when possible). */
export function normalizeTimeValue(value: string | null | undefined): string {
  if (!value) return "";
  const [hourStr, minuteStr] = value.split(":");
  if (!hourStr || !minuteStr) return value;
  const hour = Number(hourStr);
  const minute = Number(minuteStr.slice(0, 2));
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function localTimeToMinutes(value: string): number {
  const normalized = normalizeTimeValue(value);
  const [hourStr, minuteStr] = normalized.split(":");
  return Number(hourStr) * 60 + Number(minuteStr);
}

/** All same-day times on a 15-minute grid (Calendly-style dropdown source). */
export function buildTimeOptions(stepMinutes = TIME_SLOT_MINUTES): TimeOption[] {
  const options: TimeOption[] = [];
  for (let total = 0; total < 24 * 60; total += stepMinutes) {
    const hour = Math.floor(total / 60);
    const minute = total % 60;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    options.push({ value, label: formatLocalTime(value) });
  }
  return options;
}

export const START_TIME_OPTIONS = buildTimeOptions(TIME_SLOT_MINUTES);

/** End must be strictly after start on the same day. */
export function endTimeOptionsAfter(startValue: string): TimeOption[] {
  const startMinutes = localTimeToMinutes(startValue);
  return START_TIME_OPTIONS.filter((option) => localTimeToMinutes(option.value) > startMinutes);
}

export function isEndAfterStart(startValue: string, endValue: string): boolean {
  return localTimeToMinutes(endValue) > localTimeToMinutes(startValue);
}

/** Keep end valid when start moves later (defaults to ~1 hour after start). */
export function coerceEndTimeAfterStart(startValue: string, endValue: string): string {
  const options = endTimeOptionsAfter(startValue);
  if (options.length === 0) return "";

  const normalizedEnd = normalizeTimeValue(endValue);
  if (options.some((option) => option.value === normalizedEnd)) {
    return normalizedEnd;
  }

  const preferredMinutes = localTimeToMinutes(startValue) + 60;
  const preferred =
    options.find((option) => localTimeToMinutes(option.value) >= preferredMinutes) ?? options[0];
  return preferred.value;
}

/** Snap arbitrary times onto the 15-minute grid for edit forms. */
export function snapToTimeGrid(value: string, stepMinutes = TIME_SLOT_MINUTES): string {
  const normalized = normalizeTimeValue(value);
  if (!normalized) return "09:00";
  let minutes = localTimeToMinutes(normalized);
  minutes = Math.round(minutes / stepMinutes) * stepMinutes;
  if (minutes >= 24 * 60) minutes = 24 * 60 - stepMinutes;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function defaultStartTime(): string {
  return "09:00";
}

export function defaultEndTime(): string {
  return "22:00";
}

/** Normalize + validate before API submit (guards stale select state). */
export function normalizeRuleTimeRange(
  startRaw: string,
  endRaw: string,
): { startLocal: string; endLocal: string } | null {
  const startLocal = snapToTimeGrid(normalizeTimeValue(startRaw));
  let endLocal = snapToTimeGrid(normalizeTimeValue(endRaw));
  if (!isEndAfterStart(startLocal, endLocal)) {
    endLocal = coerceEndTimeAfterStart(startLocal, endLocal);
  }
  if (!endLocal || !isEndAfterStart(startLocal, endLocal)) return null;
  return { startLocal, endLocal };
}

/** Format + validate for API payloads. Never coerces an invalid range into a different time. */
export function sanitizeRuleTimes(
  startLocal: string,
  endLocal: string,
): { startLocal: string; endLocal: string } {
  const start = snapToTimeGrid(normalizeTimeValue(startLocal));
  const end = snapToTimeGrid(normalizeTimeValue(endLocal));
  if (!start || !end || !isEndAfterStart(start, end)) {
    throw new Error("End time must be after start time on the same day.");
  }
  return { startLocal: start, endLocal: end };
}
