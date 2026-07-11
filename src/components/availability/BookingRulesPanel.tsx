"use client";

import { Card } from "@/components/ui";
import type { AvailabilitySettings } from "@/lib/data-access";
import { formatDuration } from "@/lib/availability/duration";
import { formatTimezoneLabel } from "@/lib/availability/timezones";

export interface BookingRulesPanelProps {
  settings: AvailabilitySettings;
}

/** `0`/absent minutes reads as "None" — `formatDuration` returns "" for non-positive input. */
function formatMinutesLabel(minutes: number): string {
  return minutes > 0 ? formatDuration(minutes) : "None";
}

/**
 * Sidebar summary of the guide's booking policy (v2 `AvailabilitySettings` shape). Read-only
 * display, consistent with #32's settings panel — editing (`useUpdateAvailabilitySettings`) is
 * wired at the page level for a future settings-edit UI, out of CTL-55 Task 4's scope.
 */
export function BookingRulesPanel({ settings }: BookingRulesPanelProps) {
  return (
    <Card>
      <h3 className="font-display text-[18px] font-bold text-ink">Booking rules</h3>
      <p className="mt-1 text-[13px] text-ink-soft">
        These limits apply when participants choose a time from your schedule.
      </p>
      <dl className="mt-4 space-y-3 border-t border-border pt-4 text-[14px]">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Timezone</dt>
          <dd className="text-right font-medium text-ink">
            {formatTimezoneLabel(settings.timezone)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Acceptance</dt>
          <dd className="font-medium text-ink">{settings.acceptanceMode}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Response deadline</dt>
          <dd className="font-medium text-ink">
            {formatMinutesLabel(settings.responseDeadlineMin)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Minimum notice</dt>
          <dd className="font-medium text-ink">{formatMinutesLabel(settings.minNoticeMin)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Scheduling window</dt>
          <dd className="font-medium text-ink">{settings.maxAdvanceDays} days ahead</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Buffer before tour</dt>
          <dd className="font-medium text-ink">{formatMinutesLabel(settings.bufferBeforeMin)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Buffer after tour</dt>
          <dd className="font-medium text-ink">{formatMinutesLabel(settings.bufferAfterMin)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Tour lengths offered</dt>
          <dd className="text-right font-medium text-ink">
            {settings.durationsOffered.length > 0
              ? settings.durationsOffered.map((minutes) => formatDuration(minutes)).join(", ")
              : "None set"}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
