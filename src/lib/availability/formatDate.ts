export const US_DATE_PLACEHOLDER = "MM/DD/YYYY";

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const US_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/** Today's calendar date as yyyy-mm-dd (API format). Uses guide timezone when provided. */
export function todayIsoDate(timeZone?: string): string {
  if (timeZone) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Render an ISO date (yyyy-mm-dd) as mm/dd/yyyy. */
export function formatIsoDateToUs(iso: string): string {
  const match = ISO_DATE_RE.exec(iso.trim());
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function formatIsoDateParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIsoDateString(input: string): string | null {
  const match = ISO_DATE_RE.exec(input.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidCalendarDate(year, month, day)) return null;

  return formatIsoDateParts(year, month, day);
}

/** Parse mm/dd/yyyy (or m/d/yyyy) into yyyy-mm-dd, or null when invalid. */
export function parseUsDateToIso(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (ISO_DATE_RE.test(trimmed)) return parseIsoDateString(trimmed);

  const match = US_DATE_RE.exec(trimmed);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (!isValidCalendarDate(year, month, day)) return null;

  return formatIsoDateParts(year, month, day);
}

/** Normalize a form value that may be ISO or US format into ISO for the API. */
export function normalizeIsoDateInput(value: string): string | null {
  return parseUsDateToIso(value);
}
