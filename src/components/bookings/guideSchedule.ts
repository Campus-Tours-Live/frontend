import type { GuideBooking } from "@/lib/data-access";

export interface ScheduleDayGroup {
  dayKey: string;
  heading: string;
  bookings: GuideBooking[];
}

/** Local calendar day for grouping schedule rows (YYYY-MM-DD). */
export function localScheduleDayKey(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatScheduleDayHeading(dayKey: string, now = new Date()): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  if (!y || !m || !d) return dayKey;

  const date = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === tomorrow.getTime()) return "Tomorrow";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(y !== now.getFullYear() ? { year: "numeric" as const } : {}),
  }).format(date);
}

/** Chronological day groups for confirmed upcoming tours. */
export function groupBookingsByScheduleDay(bookings: GuideBooking[]): ScheduleDayGroup[] {
  const map = new Map<string, GuideBooking[]>();

  for (const booking of bookings) {
    const key = localScheduleDayKey(booking.scheduledAt);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(booking);
    map.set(key, list);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, dayBookings]) => ({
      dayKey,
      heading: formatScheduleDayHeading(dayKey),
      bookings: [...dayBookings].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      ),
    }));
}
