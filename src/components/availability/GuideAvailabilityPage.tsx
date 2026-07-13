"use client";

import { useState } from "react";
import { Alert, InlineLoading, PageContainer, PageHeader } from "@/components/ui";
import {
  useAvailabilityExceptions,
  useAvailabilityRules,
  useAvailabilitySettings,
  useResolvedAvailability,
} from "@/lib/data-access";
import { BookingRulesPanel } from "./BookingRulesPanel";
import { DateOverrideModal } from "./DateOverrideModal";
import { MonthAvailabilityView } from "./MonthAvailabilityView";
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
  const readinessMessage =
    bookable === false
      ? hasWeeklyHours
        ? "Your weekly hours have no upcoming openings — check your date overrides or blocks so participants can book you."
        : "You haven't set any availability yet, so participants can't book you. Add weekly hours to start taking bookings."
      : null;

  const openOverride = (date: string) => {
    setOverrideDate(date);
    setOverrideOpen(true);
  };

  const closeOverride = () => {
    setOverrideOpen(false);
  };

  return (
    <PageContainer width="prose">
      {/* No "Guide" eyebrow (PageHeader omits eyebrows by design): the left nav already scopes this
          to the guide area, and the page's own Step 1 / Step 2 section eyebrows below would make a
          top eyebrow read as noise. "Availability" stays the page's real <h1>. */}
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
          <aside className="mb-4 space-y-2 lg:col-span-2 lg:row-start-1 lg:mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              For reference · Booking policy
            </p>
            {settingsQuery.data ? <BookingRulesPanel settings={settingsQuery.data} /> : null}
          </aside>

          <div className="space-y-2 lg:col-start-1 lg:row-start-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              Step 1 · Set your weekly hours
            </p>
            <WeeklyHoursPanel />
          </div>

          <div className="space-y-2 lg:col-start-2 lg:row-start-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              Step 2 · Review your availability calendar
            </p>
            <MonthAvailabilityView onOpenOverride={openOverride} />
          </div>
        </div>
      ) : null}

      <DateOverrideModal open={overrideOpen} initialDate={overrideDate} onClose={closeOverride} />
    </PageContainer>
  );
}
