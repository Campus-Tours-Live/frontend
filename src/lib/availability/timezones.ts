/**
 * Alias-tolerant IANA timezone validation, matching the backend's `ZoneId.of` semantics.
 *
 * Deliberately NOT a canonical-only whitelist (that was #32's approach, which this replaces):
 * `Intl.DateTimeFormat` accepts IANA link/alias names — e.g. `"US/Pacific"` and
 * `"Asia/Calcutta"` — not just their canonical forms (`"America/Los_Angeles"`,
 * `"Asia/Kolkata"`). A hardcoded canonical-only list would reject valid zones the backend
 * happily resolves, so this defers entirely to the runtime's own IANA database.
 */
export function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    // Constructing the formatter is what validates `tz` — it throws a RangeError for anything
    // that isn't a recognized IANA zone (canonical or alias). The instance itself is unused.
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Friendly display label for an IANA zone, e.g. `"America/Los_Angeles"` -> `"America/Los Angeles"`. */
export function formatTimezoneLabel(tz: string): string {
  return tz.replace(/_/g, " ");
}
