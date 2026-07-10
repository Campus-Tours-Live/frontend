const FALLBACK_TIME_ZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "UTC",
];

let cachedTimeZones: string[] | null = null;

/** Sorted IANA timezone ids for validated selects. */
export function listIanaTimeZones(): string[] {
  if (cachedTimeZones) return cachedTimeZones;

  if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
    cachedTimeZones = [...Intl.supportedValuesOf("timeZone")].sort();
    return cachedTimeZones;
  }

  cachedTimeZones = [...FALLBACK_TIME_ZONES];
  return cachedTimeZones;
}

export function isValidIanaTimeZone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return listIanaTimeZones().includes(trimmed);
}
