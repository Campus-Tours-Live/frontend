/**
 * Time-of-day greeting for dashboard headers. Uses the local (browser) clock, so it is
 * only meaningful client-side. Shared by the guide and participant dashboards.
 */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning"; // 05:00–11:59
  if (hour >= 12 && hour < 17) return "Good afternoon"; // 12:00–16:59
  return "Good evening"; // 17:00–04:59 (incl. the small hours after midnight)
}
