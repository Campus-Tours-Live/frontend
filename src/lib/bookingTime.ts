/** Booking time display helpers. Contract-A provides UTC instants; the browser owns display tz. */

export const BOOKING_TIME_PLACEHOLDER = "—";

export interface BookingTimeRangeInput {
  scheduledStartAt: string | null | undefined;
  scheduledEndAt: string | null | undefined;
}

function parseInstant(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function localDateKey(date: Date, timeZone: string, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") byType[part.type] = part.value;
  }
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function timeZoneNameFor(date: Date, timeZone: string, locale: string): string | null {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "numeric",
    timeZoneName: "short",
  }).formatToParts(date);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? null;
}

export function getViewerTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

export function formatViewerLocalBookingTimeRange(
  input: BookingTimeRangeInput,
  timeZone: string | null | undefined,
  locale = "en-US",
): string {
  const start = parseInstant(input.scheduledStartAt);
  const end = parseInstant(input.scheduledEndAt);
  if (!start || !end || !timeZone) return BOOKING_TIME_PLACEHOLDER;

  try {
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      weekday: "short",
      month: "numeric",
      day: "numeric",
    });
    const startTimeZoneName = timeZoneNameFor(start, timeZone, locale);
    const endTimeZoneName = timeZoneNameFor(end, timeZone, locale);
    const includeStartTimeZone =
      startTimeZoneName != null && endTimeZoneName != null && startTimeZoneName !== endTimeZoneName;
    const startTimeFormatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      ...(includeStartTimeZone ? { timeZoneName: "short" } : {}),
    });
    const endTimeFormatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });

    const startDay = localDateKey(start, timeZone, locale);
    const endDay = localDateKey(end, timeZone, locale);
    const startDate = dateFormatter.format(start);
    const startTime = startTimeFormatter.format(start);
    const endTime = endTimeFormatter.format(end);

    if (startDay === endDay) {
      return `${startDate} · ${startTime} – ${endTime}`;
    }

    return `${startDate} · ${startTime} – ${dateFormatter.format(end)} · ${endTime}`;
  } catch {
    return BOOKING_TIME_PLACEHOLDER;
  }
}
