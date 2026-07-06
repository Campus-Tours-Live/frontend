import type { AvailabilityExceptionType, AvailabilityRule } from "@/lib/data-access";
import { formatLocalTime } from "@/lib/availability/formatTime";

export { formatLocalTime };

/** 0=Sunday … 6=Saturday (matches Core schema). */
export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_LABELS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const EXCEPTION_TYPE_LABELS: Record<AvailabilityExceptionType, string> = {
  UNAVAILABLE_ALL_DAY: "Unavailable (all day)",
  UNAVAILABLE_RANGE: "Unavailable (time range)",
  ADDITIONAL: "Extra availability",
};

export function formatTimeRange(startLocal: string, endLocal: string): string {
  return `${formatLocalTime(startLocal)} – ${formatLocalTime(endLocal)}`;
}

export function formatTimezoneLabel(timezone: string): string {
  return timezone.replace(/_/g, " ");
}

export function groupRulesByDay(rules: AvailabilityRule[]): Map<number, AvailabilityRule[]> {
  const grouped = new Map<number, AvailabilityRule[]>();
  for (const rule of rules) {
    const list = grouped.get(rule.dayOfWeek) ?? [];
    list.push(rule);
    grouped.set(rule.dayOfWeek, list);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => a.startLocal.localeCompare(b.startLocal));
  }
  return grouped;
}

export function formatNotice(minutes: number): string {
  if (minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

export { todayIsoDate } from "@/lib/availability/formatDate";

export function formatExceptionDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
