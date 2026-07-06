/** Calendly-style compact time, e.g. 9:00am */
export function formatLocalTime(value: string): string {
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const period = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 || 12;
  const mins = minuteStr.padStart(2, "0").slice(0, 2);
  return `${hour12}:${mins}${period}`;
}
