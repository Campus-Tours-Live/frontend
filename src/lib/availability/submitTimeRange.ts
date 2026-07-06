import { isEndAfterStart, normalizeTimeValue, snapToTimeGrid } from "./timeOptions";

/** Strict parse for API submit — format only, never silently change the user's pick. */
export function parseRuleTimeRangeForSubmit(
  startRaw: string,
  endRaw: string,
): { startLocal: string; endLocal: string } | null {
  const startLocal = snapToTimeGrid(normalizeTimeValue(startRaw));
  const endLocal = snapToTimeGrid(normalizeTimeValue(endRaw));
  if (!startLocal || !endLocal || !isEndAfterStart(startLocal, endLocal)) {
    return null;
  }
  return { startLocal, endLocal };
}
