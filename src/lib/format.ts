/** Locale-aware display formatters (presentation only — kept at the edge, not in the API). */

/**
 * Render an ISO-8601 timestamp (e.g. Core MeResponse.createdAt, stored UTC) as month + year
 * with the month spelled out: "2026-06-21T15:50:43Z" → "June 2026". Used for the member card's
 * "Member since" line. The locale lives here (the client), so the API stays locale-neutral.
 */
export function formatMonthYear(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d);
}

/**
 * Render a minor-unit price (cents) as a locale-aware currency string.
 * e.g. 4200 USD → "$42.00", 4250 EUR → "€42.50" (en-US).
 */
export function formatOfferingPrice(priceCents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}
