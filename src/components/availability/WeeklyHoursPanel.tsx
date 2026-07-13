"use client";

import { useState } from "react";
import { Alert, Button, Card, Toggle } from "@/components/ui";
import {
  ApiError,
  useAvailabilityRules,
  useAvailabilitySettings,
  useUpdateAvailabilityRule,
  type AffectedBooking,
  type AvailabilityRule,
} from "@/lib/data-access";
import { formatFromTo } from "@/lib/availability/fromTo";
import { DAY_LABELS } from "./availabilityHelpers";
import { AffectedBookingsNotice } from "./AffectedBookingsNotice";
import { DayHoursModal } from "./DayHoursModal";

const FALLBACK_TIMEZONE = "America/Los_Angeles";

/** Bucket rules by day for layout only — kept here independently since this panel owns its own
 *  hooks (no callback props from the page). */
function groupRulesByDay(rules: AvailabilityRule[]): Map<number, AvailabilityRule[]> {
  const grouped = new Map<number, AvailabilityRule[]>();
  for (const rule of rules) {
    const list = grouped.get(rule.dayOfWeek) ?? [];
    list.push(rule);
    grouped.set(rule.dayOfWeek, list);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => a.startLocal.localeCompare(b.startLocal));
  }
  return grouped;
}

/** Dedupe affected bookings by id — deactivating a multi-rule day fires one write per rule, and a
 *  booking that spans two of the day's ranges would otherwise be listed once per rule. */
function dedupeBookings(bookings: AffectedBooking[]): AffectedBooking[] {
  const seen = new Set<string>();
  const out: AffectedBooking[] = [];
  for (const booking of bookings) {
    if (!seen.has(booking.bookingId)) {
      seen.add(booking.bookingId);
      out.push(booking);
    }
  }
  return out;
}

function toggleErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 422) {
    return (
      err.message ||
      "Could not turn this day back on — one of its hours now overlaps another active rule."
    );
  }
  return "Could not update this day's availability. Please try again.";
}

/**
 * 7-day inline weekly hours editor (CTL-55 v2.1, Cal.com/Calendly-style) — replaces the old
 * per-rule-bar weekly panel. Each day is a single row: an
 * Available/Unavailable toggle (drives rule `active`, deactivate-preserve — never deletes a rule)
 * + that day's active ranges rendered read-only as from–to (`formatFromTo`) + one `Edit` button
 * opening `DayHoursModal`. No per-pill edit/delete — range editing only happens inside the modal.
 *
 * Self-contained: consumes `useAvailabilityRules`/`useUpdateAvailabilityRule`/
 * `useAvailabilitySettings` directly rather than taking them as props.
 */
export function WeeklyHoursPanel() {
  const rulesQuery = useAvailabilityRules();
  const settingsQuery = useAvailabilitySettings();
  const updateRule = useUpdateAvailabilityRule();

  const [modalDay, setModalDay] = useState<number | null>(null);
  const [togglingDay, setTogglingDay] = useState<number | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  // Bookings the last toggle overlapped, bound to the day it happened on (allow+notify). Shown
  // under that day's row until the next toggle. Deactivating a whole weekday is the highest-impact
  // availability write (it can strand several existing bookings at once), so it must notify too.
  const [affected, setAffected] = useState<{ day: number; bookings: AffectedBooking[] } | null>(
    null,
  );

  const rules = rulesQuery.data ?? [];
  const settingsTimezone = settingsQuery.data?.timezone ?? FALLBACK_TIMEZONE;
  const rulesByDay = groupRulesByDay(rules);

  const handleToggle = async (dayOfWeek: number, nextAvailable: boolean) => {
    setToggleError(null);
    setAffected(null);
    const dayRules = rulesByDay.get(dayOfWeek) ?? [];

    if (nextAvailable && dayRules.length === 0) {
      // Nothing to re-activate yet — open the modal so the guide adds the first range instead.
      setModalDay(dayOfWeek);
      return;
    }

    const rulesToFlip = dayRules.filter((rule) => rule.active !== nextAvailable);
    if (rulesToFlip.length === 0) return;

    setTogglingDay(dayOfWeek);
    try {
      // Batch update — every rule for the day flips together. NOTE: not transactional (Core has
      // no bulk endpoint); if a multi-rule day partially fails mid-Promise.all, the ones that
      // already resolved stay flipped. The tested/expected scenario (re-activating a single-rule
      // day) can't partially succeed, and any 422 still surfaces here rather than being swallowed.
      const envelopes = await Promise.all(
        rulesToFlip.map((rule) =>
          updateRule.mutateAsync({ id: rule.id, body: { active: nextAvailable } }),
        ),
      );
      // Allow + notify: the flip is saved. If turning this day off overlapped existing bookings,
      // surface them under the day's row (they are never auto-cancelled) so the guide can follow up.
      const bookings = dedupeBookings(envelopes.flatMap((envelope) => envelope.affectedBookings));
      if (bookings.length > 0) {
        setAffected({ day: dayOfWeek, bookings });
      }
    } catch (err) {
      // Leave the day Unavailable: the failed mutation never invalidates the rules query, so
      // `rulesQuery.data` (and therefore `isAvailable` below) stays exactly as it was — no silent
      // partial success.
      setToggleError(toggleErrorMessage(err));
    } finally {
      setTogglingDay(null);
    }
  };

  const openModalDay = modalDay != null ? modalDay : null;

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-display text-[20px] font-bold text-ink">Weekly hours</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          Set when you are typically available for tours, shown as from–to ranges for each day.
        </p>
        {toggleError ? (
          <Alert variant="error" className="mt-3">
            {toggleError}
          </Alert>
        ) : null}
      </div>

      <div role="list" aria-label="Weekly hours by day">
        {DAY_LABELS.map((dayLabel, dayIndex) => {
          const dayRules = rulesByDay.get(dayIndex) ?? [];
          const activeRules = dayRules.filter((rule) => rule.active);
          const isAvailable = activeRules.length > 0;
          const isToggling = togglingDay === dayIndex;

          return (
            <div
              key={dayLabel}
              role="listitem"
              className="border-b border-border px-5 py-4 last:border-b-0 sm:px-6"
            >
              {/* Header row: day name (left) + status label & toggle (right) */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[14px] font-semibold text-ink">{dayLabel}</span>
                <div className="flex shrink-0 items-center gap-5">
                  <span
                    className={
                      "text-[14px] font-bold " + (isAvailable ? "text-primary" : "text-ink-soft")
                    }
                  >
                    {isToggling ? "Saving…" : isAvailable ? "Available" : "Unavailable"}
                  </span>
                  <Toggle
                    checked={isAvailable}
                    onChange={(next) => void handleToggle(dayIndex, next)}
                    disabled={isToggling}
                    label={`${dayLabel} availability`}
                  />
                </div>
              </div>

              {/* Hours row: from–to ranges (left) + Edit hours (right, aligned to first line) */}
              <div className="mt-3 flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  {isAvailable ? (
                    activeRules.map((rule) => (
                      <span key={rule.id} className="text-[14px] text-ink">
                        {formatFromTo(rule.startLocal, rule.windowMin)}
                      </span>
                    ))
                  ) : (
                    <span className="text-[14px] text-ink-soft">No hours set</span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalDay(dayIndex)}
                  aria-label={`Edit ${dayLabel} hours`}
                  className="shrink-0"
                >
                  Edit
                </Button>
              </div>

              {affected?.day === dayIndex ? (
                <div className="mt-3">
                  <AffectedBookingsNotice
                    bookings={affected.bookings}
                    timeZone={settingsTimezone}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <DayHoursModal
        open={openModalDay != null}
        dayOfWeek={openModalDay ?? 0}
        dayLabel={openModalDay != null ? DAY_LABELS[openModalDay] : ""}
        rules={openModalDay != null ? (rulesByDay.get(openModalDay) ?? []) : []}
        settingsTimezone={settingsTimezone}
        onClose={() => setModalDay(null)}
      />
    </Card>
  );
}
