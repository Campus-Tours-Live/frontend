import { getTimeGreeting } from "@/lib/greeting";

/**
 * Dashboard greeting line, e.g. "Good morning, Maya" — the time-of-day greeting plus the
 * user's first name, falling back to "there" when the name is missing/blank. Shared by the
 * guide and participant dashboard headers (kept here, not in `lib/`, because it is
 * dashboard-specific rather than a general-purpose helper).
 */
export function dashboardGreeting(name?: string | null): string {
  return `${getTimeGreeting()}, ${name?.trim() || "there"}`;
}
