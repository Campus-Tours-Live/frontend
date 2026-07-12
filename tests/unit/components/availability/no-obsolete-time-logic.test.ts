import { existsSync, readFileSync } from "fs";
import path from "path";
import { presetValueToMinutes } from "@/lib/availability/duration";

/**
 * CTL-55 Task 2 replaces the old start+END time-range picker (PR #32) with start+duration. This
 * guards against the obsolete end-of-day / `23:59` / snap-to-grid / wraparound machinery quietly
 * creeping back in: it must not exist on disk, and the new modals must not reference it.
 *
 * CTL-55 Task 5: the original v2 rule/exception form modals this guard was written against were
 * removed and superseded by `DayHoursModal` (weekly) and `DateOverrideModal` (date-specific),
 * which carry the same start+duration storage model (a from–to *display* on top, never an
 * end-time/sentinel one) forward. `MODALS_UNDER_TEST` now scans those instead.
 */

const repoRoot = path.resolve(__dirname, "../../../..");

const BANNED_MODULES = [
  "src/lib/availability/submitTimeRange.ts",
  "src/lib/availability/timeOptions.ts",
  "src/components/availability/timeOptions.ts",
  "src/components/availability/TimeRangeSelect.tsx",
  // #32's legacy end-time formatter (superseded by `lib/availability/duration.ts`'s
  // `formatWindow`/`formatDuration` — CTL-55 Task 2-review completeness gap).
  "src/lib/availability/formatTime.ts",
];

const BANNED_TOKENS = [
  "submitTimeRange",
  "timeOptions",
  "snapToTimeGrid",
  "23:59",
  "endLocal",
  "parseRuleTimeRangeForSubmit",
];

const MODALS_UNDER_TEST = [
  "src/components/availability/DayHoursModal.tsx",
  "src/components/availability/DateOverrideModal.tsx",
  "src/components/availability/WeeklyHoursPanel.tsx",
  "src/components/availability/DurationField.tsx",
  "src/lib/availability/duration.ts",
  "src/lib/availability/fromTo.ts",
];

describe("no obsolete end-time / sentinel / snap-to-grid code path", () => {
  it("does not bring the old submitTimeRange/timeOptions/TimeRangeSelect modules over", () => {
    for (const relativePath of BANNED_MODULES) {
      expect(existsSync(path.join(repoRoot, relativePath))).toBe(false);
    }
  });

  it("the start+duration modals/helpers never reference the banned end-time tokens", () => {
    for (const relativePath of MODALS_UNDER_TEST) {
      const source = readFileSync(path.join(repoRoot, relativePath), "utf8");
      for (const token of BANNED_TOKENS) {
        expect(source).not.toContain(token);
      }
    }
  });

  it("windowMin has no 24:00-style sentinel: minutes map straight through, unmodified", () => {
    // A window that runs past midnight (22:00 start + 4h) is just 240 minutes — never rewritten
    // to a sentinel or clamped to end-of-day.
    expect(presetValueToMinutes("240")).toBe(240);
  });
});
