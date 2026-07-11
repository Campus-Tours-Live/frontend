"use client";

import { Pencil, Plus, X } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { AvailabilityRule } from "@/lib/data-access";
import { formatWindow } from "@/lib/availability/duration";
import { DAY_LABELS } from "./availabilityHelpers";

export interface WeeklySchedulePanelProps {
  rules: AvailabilityRule[];
  onAddDay: (dayOfWeek: number) => void;
  onEditRule: (rule: AvailabilityRule) => void;
  onRemoveRule: (rule: AvailabilityRule) => void;
  removingRuleId?: string | null;
}

/** Bucket rules by day for layout only — each rule keeps its own bar. This is NOT a coalesce:
 *  two overlapping rules on the same day both land in that day's array and both render. The
 *  merged/"actual availability" view comes from the backend resolved read, rendered elsewhere
 *  (`ResolvedAvailabilityPreview`), never computed here. */
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

/**
 * Weekly hours grid — one editable/deletable bar PER RULE, grouped by day-of-week for layout.
 * The guide edits rules directly here; two overlapping rules on the same day render as two
 * separate bars (never merged/coalesced client-side — CTL-55 Task 4 locked data model).
 */
export function WeeklySchedulePanel({
  rules,
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
          Set when you are typically available for tours. Each block is its own rule — overlapping
          blocks on the same day stay separately editable here.
        </p>
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
                  dayRules.map((rule) => {
                    const label = formatWindow(rule.startLocal, rule.windowMin);
                    return (
                      <div
                        key={rule.id}
                        className={
                          "group inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-ink shadow-sm" +
                          (rule.active ? "" : " opacity-60")
                        }
                      >
                        <span>{label}</span>
                        <button
                          type="button"
                          onClick={() => onEditRule(rule)}
                          className="rounded p-0.5 text-ink-soft hover:bg-canvas hover:text-ink"
                          aria-label={`Edit ${label} on ${dayLabel}`}
                        >
                          <Pencil size={12} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveRule(rule)}
                          disabled={removingRuleId === rule.id}
                          className="rounded p-0.5 text-ink-soft hover:bg-error-soft hover:text-error-foreground disabled:opacity-40"
                          aria-label={`Remove ${label} on ${dayLabel}`}
                        >
                          <X size={12} aria-hidden />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onAddDay(dayIndex)}
                className="h-8 w-8 shrink-0 rounded-full p-0 text-ink-soft hover:bg-primary-soft hover:text-primary"
                aria-label={`Add hours on ${dayLabel}`}
              >
                <Plus size={16} aria-hidden />
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
