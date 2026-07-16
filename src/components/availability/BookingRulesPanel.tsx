"use client";

import { useState } from "react";
import { Panel, PanelHeader } from "@/components/ui";
import type { AvailabilitySettings } from "@/lib/data-access";
import { formatDuration } from "@/lib/availability/duration";
import { formatTimezoneLabel } from "@/lib/availability/timezones";
import { cn } from "@/lib/utils";

export interface BookingRulesPanelProps {
  settings: AvailabilitySettings;
}

/** `0`/absent minutes reads as "None" — `formatDuration` returns "" for non-positive input. */
function formatMinutesLabel(minutes: number): string {
  return minutes > 0 ? formatDuration(minutes) : "None";
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

/**
 * Sidebar summary of the guide's booking policy (v2 `AvailabilitySettings` shape). Read-only
 * display, consistent with #32's settings panel. Editing (`useUpdateAvailabilitySettings`) is
 * NOT wired to any component here — this panel and the rest of CTL-55 are display-only; a
 * settings-edit UI is out of scope and tracked as a future ticket.
 *
 * Built on the shared {@link Panel} (header + divider + body), same as the schedule panels.
 *
 * Responsive disclosure (CTL-55 IA pass): below `lg` this is a reference aside stacked under the
 * schedule, so it collapses to a 3-field summary (timezone, response deadline, minimum notice)
 * behind a "View all rules" toggle to keep the mobile scroll short. From `lg` up it lives in the
 * right column, so the full policy is always shown and the toggle is hidden — the collapse is
 * purely a mobile affordance driven by responsive classes, not by `expanded`.
 */
export function BookingRulesPanel({ settings }: BookingRulesPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const durationsLabel =
    settings.durationsOffered.length > 0
      ? settings.durationsOffered.map((minutes) => formatDuration(minutes)).join(", ")
      : "None set";

  return (
    <Panel
      divider="inset"
      header={
        <PanelHeader
          title="Booking rules"
          subtitle="These limits apply when participants choose a time from your schedule."
          action={
            // Mobile-only disclosure toggle, top-right beside the title; hidden from `lg` up.
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((prev) => !prev)}
              className="whitespace-nowrap text-[13px] font-semibold text-primary hover:underline lg:hidden"
            >
              {expanded ? "Show less" : "View all rules"}
            </button>
          }
        />
      }
    >
      <div className="px-5 py-4 sm:px-6">
        {/* Mobile-only condensed summary; hidden once expanded and always from `lg` up. */}
        <dl
          data-testid="booking-rules-summary"
          className={cn("space-y-3 text-[14px]", expanded ? "hidden" : "block lg:hidden")}
        >
          <RuleRow label="Timezone" value={formatTimezoneLabel(settings.timezone)} />
          <RuleRow
            label="Response deadline"
            value={formatMinutesLabel(settings.responseDeadlineMin)}
          />
          <RuleRow label="Minimum notice" value={formatMinutesLabel(settings.minNoticeMin)} />
        </dl>

        {/* Full policy: shown when expanded (mobile) or always from `lg` up. */}
        <dl
          data-testid="booking-rules-full"
          className={cn("space-y-3 text-[14px]", expanded ? "block" : "hidden lg:block")}
        >
          <RuleRow label="Timezone" value={formatTimezoneLabel(settings.timezone)} />
          <RuleRow label="Acceptance" value={settings.acceptanceMode} />
          <RuleRow
            label="Response deadline"
            value={formatMinutesLabel(settings.responseDeadlineMin)}
          />
          <RuleRow label="Minimum notice" value={formatMinutesLabel(settings.minNoticeMin)} />
          <RuleRow label="Scheduling window" value={`${settings.maxAdvanceDays} days ahead`} />
          <RuleRow
            label="Buffer before tour"
            value={formatMinutesLabel(settings.bufferBeforeMin)}
          />
          <RuleRow label="Buffer after tour" value={formatMinutesLabel(settings.bufferAfterMin)} />
          <RuleRow label="Tour lengths offered" value={durationsLabel} />
        </dl>
      </div>
    </Panel>
  );
}
