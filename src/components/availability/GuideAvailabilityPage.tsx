"use client";

import { useState } from "react";
import { Alert, InlineLoading, PageContainer, PageHeader, SegmentedControl } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { useMediaQuery } from "@/hooks";
import {
  useAvailabilityExceptions,
  useAvailabilityRules,
  useAvailabilitySettings,
  useResolvedAvailability,
} from "@/lib/data-access";
import { BookingRulesPanel } from "./BookingRulesPanel";
import { DateOverrideModal } from "./DateOverrideModal";
import { MonthAvailabilityView } from "./MonthAvailabilityView";
import { WeekAvailabilityPanel } from "./WeekAvailabilityPanel";
import { WeeklyHoursPanel } from "./WeeklyHoursPanel";

/**
 * Guide availability workspace (CTL-55 v2.1) — assembles the 7-day inline weekly editor
 * (`WeeklyHoursPanel`, Task 2), the month-density "actual availability" view (`MonthAvailabilityView`,
 * Task 3), the shared date-specific override modal
 * (`DateOverrideModal`, Task 4), and the read-only `BookingRulesPanel`.
 *
 * Each panel/modal is self-contained — it owns its own data-access hooks and mutations rather than
 * taking them as props (see `WeeklyHoursPanel`/`MonthAvailabilityView`/
 * `DateOverrideModal`, all of which call `useAvailabilitySettings()` etc. directly). So this page
 * only owns:
 *  - the month-click → override-modal wiring: `MonthAvailabilityView`'s `onOpenOverride(isoDate)`
 *    sets which date is preselected and opens `DateOverrideModal` with it;
 *  - the four availability queries used purely for the page-level loading/error banner (mirrors
 *    the pre-v2.1 page's gate) and the `settings` object `BookingRulesPanel` needs as a prop.
 *
 * Write 422s (weekly-toggle re-activate conflicts, day-hours overlaps, date-override conflicts)
 * are surfaced by each panel/modal itself via the established in-dialog `Alert variant="error"`
 * pattern (`WeeklyHoursPanel`'s toggle alert, `DayHoursModal`, `DateOverrideModal`) — there is no
 * separate page-level write here, so no additional top-level Alert/toast is needed.
 */
export function GuideAvailabilityPage() {
  const rulesQuery = useAvailabilityRules();
  const exceptionsQuery = useAvailabilityExceptions();
  const settingsQuery = useAvailabilitySettings();
  const resolvedQuery = useResolvedAvailability();

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState<string | null>(null);
  // Mobile flow: tapping a day opens a detail sheet first; "Add/Edit override" swaps it for the
  // editor and remembers to return to that sheet when the editor is dismissed. Desktop skips the
  // sheet entirely (a day tap opens the editor directly).
  const isTouch = useMediaQuery("(hover: none), (max-width: 1023px)");
  const [daySheetDate, setDaySheetDate] = useState<string | null>(null);
  const [returnToDaySheet, setReturnToDaySheet] = useState(false);
  // Which of the two panels is visible on narrow screens. Desktop (`lg:`) shows both side by
  // side, so this only drives the mobile view switch; both panels stay mounted regardless
  // (layout only — no content or state change). `null` = follow the data-driven default computed
  // below (calendar hero, or the weekly editor when no hours are set yet); a manual tap pins it.
  const [mobileViewOverride, setMobileViewOverride] = useState<"calendar" | "weekly" | null>(null);

  const isLoading =
    rulesQuery.isLoading ||
    exceptionsQuery.isLoading ||
    settingsQuery.isLoading ||
    resolvedQuery.isLoading;
  const isError =
    rulesQuery.isError || exceptionsQuery.isError || settingsQuery.isError || resolvedQuery.isError;

  // Readiness notice (CTL-55 B1) — pure presentation of the two backend-derived readiness signals
  // on the resolved-availability read (`bookable`, `hasWeeklyHours`); the FE never recomputes
  // availability, so this only chooses copy based on the flags, never derives them.
  const bookable = resolvedQuery.data?.bookable;
  const hasWeeklyHours = resolvedQuery.data?.hasWeeklyHours;
  // The guide hasn't set any weekly hours yet (the "add weekly hours to start taking bookings"
  // state). Date overrides adjust the weekly baseline, so there's nothing to override until it
  // exists — the calendar disables "Add override" and explains why in this state.
  const weeklyHoursMissing = bookable === false && hasWeeklyHours === false;
  const readinessMessage =
    bookable === false
      ? hasWeeklyHours
        ? "Your weekly hours have no upcoming openings — check your date overrides or blocks so participants can book you."
        : "You haven't set any availability yet, so participants can't book you. Add weekly hours to start taking bookings."
      : null;

  // Point the mobile view switch at the weekly editor when the guide has no weekly hours yet (the
  // "add weekly hours to start taking bookings" state above) so the switch lands on the next step;
  // otherwise the calendar is the default hero. A manual tap (`mobileViewOverride`) always wins.
  const mobileView = mobileViewOverride ?? (weeklyHoursMissing ? "weekly" : "calendar");

  const handleDayClick = (date: string) => {
    // Mobile opens the day sheet; desktop opens the editor modal. The blocked case (no weekly hours)
    // is handled inside MonthAvailabilityView: the mobile sheet disables its action, and a desktop
    // click shows a notice there instead of routing here — so this only runs for allowed clicks.
    if (isTouch) {
      setDaySheetDate(date);
    } else {
      setReturnToDaySheet(false);
      setOverrideDate(date);
      setOverrideOpen(true);
    }
  };

  // "Add/Edit override" from the day sheet: swap the sheet for the editor, remembering to return.
  // Guarded — the sheet's button is disabled while weekly hours are missing, so this never fires then.
  const handleEditOverride = (date: string) => {
    /* istanbul ignore next -- defensive: the day sheet's "Add/Edit override" button is disabled
     * while weeklyHoursMissing (MonthAvailabilityView), and a disabled <button> never dispatches a
     * click event (DOM spec), so this guard never actually fires via user interaction. */
    if (weeklyHoursMissing) return;
    setDaySheetDate(null);
    setReturnToDaySheet(true);
    setOverrideDate(date);
    setOverrideOpen(true);
  };

  // Editor dismissed (Cancel / save / backdrop / Escape): close it, and on mobile go back to the
  // day sheet it was opened from.
  const handleOverrideClose = () => {
    setOverrideOpen(false);
    if (returnToDaySheet && overrideDate) {
      setDaySheetDate(overrideDate);
      setReturnToDaySheet(false);
    }
  };

  return (
    <PageContainer width="wide">
      {/* No "Guide" eyebrow (PageHeader omits eyebrows by design): the left nav already scopes this
          to the guide area. "Availability" stays the page's real <h1>. */}
      <PageHeader
        title="Availability"
        lead="Manage when participants can book you — weekly hours, date overrides, and booking limits."
      />

      {isLoading ? <InlineLoading label="Loading availability…" /> : null}

      {isError ? <Alert variant="error">Failed to load your availability.</Alert> : null}

      {!isLoading && !isError && readinessMessage ? (
        <Alert variant="warning" role="status">
          {readinessMessage}
        </Alert>
      ) : null}

      {!isLoading && !isError ? (
        <div className="space-y-4">
          <aside className="space-y-2">
            {settingsQuery.data ? <BookingRulesPanel settings={settingsQuery.data} /> : null}
          </aside>

          {/* Mobile view switch — desktop shows both columns side by side, so the segmented control
              is mobile-only (`lg:hidden`). Both panels stay mounted; the switch only toggles which
              one is visible on mobile (state/behavior untouched). No section heading here: it would
              just repeat the page's "Availability" <h1>; the two switch labels already say what's
              below. */}
          <div className="space-y-2 lg:hidden">
            <SegmentedControl<"calendar" | "weekly">
              aria-label="Choose availability view"
              value={mobileView}
              onChange={setMobileViewOverride}
              options={[
                { value: "calendar", label: "Bookable days" },
                { value: "weekly", label: "Weekly hours" },
              ]}
            />
          </div>

          {/* Calendar hero + weekly rail (Variant B): two plain cards side by side — no wrapping
              frame, so they match the Booking-rules card and the rest of the page. Calendar is the
              hero (`1fr`), weekly a narrower rail. `lg:items-stretch` keeps both columns the same
              height as the taller one, re-solving as weekly hours grow/shrink. The right column is a
              flex-col holding the calendar + a week/day detail panel that grows (`flex-1`) to fill the
              extra height, so the right side has no void while matching the left. Weekly gets
              `lg:h-full` to fill its side. Below `lg` the columns collapse and the mobile switch shows
              one at a time (the week/day panel is desktop-only). */}
          <div className="lg:grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-stretch lg:gap-4">
            <div
              className={cn(
                "lg:col-start-1 lg:block",
                mobileView === "weekly" ? "block" : "hidden",
              )}
            >
              <WeeklyHoursPanel />
            </div>

            <div
              className={cn(
                "lg:col-start-2 lg:flex lg:h-full lg:flex-col lg:gap-4",
                mobileView === "calendar" ? "block" : "hidden",
              )}
            >
              <MonthAvailabilityView
                onDayClick={handleDayClick}
                daySheetDate={daySheetDate}
                onDaySheetClose={() => setDaySheetDate(null)}
                onEditOverride={handleEditOverride}
                canAddOverride={!weeklyHoursMissing}
              />
              <WeekAvailabilityPanel className="hidden lg:flex lg:flex-1" />
            </div>
          </div>
        </div>
      ) : null}

      <DateOverrideModal
        open={overrideOpen}
        initialDate={overrideDate}
        onClose={handleOverrideClose}
      />
    </PageContainer>
  );
}
