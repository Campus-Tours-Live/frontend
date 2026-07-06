"use client";

import { Card } from "@/components/ui";
import type { BookingSettings } from "@/lib/data-access";
import { formatNotice, formatTimezoneLabel } from "./availabilityHelpers";

interface BookingRulesPanelProps {
  settings: BookingSettings;
}

/** Sidebar summary of booking constraints (Calendly-adjacent “settings” panel). */
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
          <dt className="text-ink-soft">Minimum notice</dt>
          <dd className="font-medium text-ink">{formatNotice(settings.minNoticeMin)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Scheduling window</dt>
          <dd className="font-medium text-ink">{settings.maxAdvanceDays} days ahead</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Buffer after tour</dt>
          <dd className="font-medium text-ink">{settings.bufferAfterMin} min</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Acceptance</dt>
          <dd className="font-medium text-ink">{settings.acceptanceMode}</dd>
        </div>
      </dl>
    </Card>
  );
}
