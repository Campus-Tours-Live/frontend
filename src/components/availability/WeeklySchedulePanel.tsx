"use client";

import { Globe } from "lucide-react";
import { Card } from "@/components/ui";
import type { AvailabilityRule } from "@/lib/data-access";
import { DAY_LABELS, formatTimezoneLabel, groupRulesByDay } from "./availabilityHelpers";
import { DayAddButton, TimeSlotChip } from "./TimeSlotChip";

interface WeeklySchedulePanelProps {
  rules: AvailabilityRule[];
  timezone: string;
  onAddDay: (dayOfWeek: number) => void;
  onEditRule: (rule: AvailabilityRule) => void;
  onRemoveRule: (rule: AvailabilityRule) => void;
  removingRuleId?: string | null;
}

/**
 * Calendly-inspired weekly hours grid: all seven days visible, time pills per row,
 * “Unavailable” empty state, and a per-day add control.
 */
export function WeeklySchedulePanel({
  rules,
  timezone,
  onAddDay,
  onEditRule,
  onRemoveRule,
  removingRuleId,
}: WeeklySchedulePanelProps) {
  const rulesByDay = groupRulesByDay(rules);

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-display text-[20px] font-bold text-ink">Weekly hours</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          Set when you are typically available for tours. Participants book inside these windows.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-canvas px-3 py-1.5 text-[13px] text-ink">
          <Globe size={14} className="shrink-0 text-ink-soft" aria-hidden />
          <span className="text-ink-soft">Timezone</span>
          <span className="font-medium">{formatTimezoneLabel(timezone)}</span>
        </div>
      </div>

      <div role="list" aria-label="Weekly hours by day">
        {DAY_LABELS.map((dayLabel, dayIndex) => {
          const dayRules = rulesByDay.get(dayIndex) ?? [];
          const unavailable = dayRules.length === 0;

          return (
            <div
              key={dayLabel}
              role="listitem"
              className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-b-0 sm:flex-row sm:items-start sm:gap-4 sm:px-6"
            >
              <div className="w-full shrink-0 sm:w-[108px]">
                <span className="text-[14px] font-semibold text-ink">{dayLabel}</span>
              </div>

              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {unavailable ? (
                  <span className="text-[14px] text-ink-soft">Unavailable</span>
                ) : (
                  dayRules.map((rule) => (
                    <TimeSlotChip
                      key={rule.id}
                      rule={rule}
                      onEdit={() => onEditRule(rule)}
                      onRemove={() => onRemoveRule(rule)}
                      removing={removingRuleId === rule.id}
                    />
                  ))
                )}
              </div>

              <DayAddButton dayLabel={dayLabel} onClick={() => onAddDay(dayIndex)} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
