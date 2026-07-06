"use client";

import { Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { AvailabilityRule } from "@/lib/data-access";
import { cn } from "@/lib/utils";
import { formatTimeRange } from "./availabilityHelpers";

interface TimeSlotChipProps {
  rule: AvailabilityRule;
  onEdit: () => void;
  onRemove: () => void;
  removing?: boolean;
}

/** Calendly-style bordered time-range pill with edit/remove affordances. */
export function TimeSlotChip({ rule, onEdit, onRemove, removing }: TimeSlotChipProps) {
  return (
    <div
      className={cn(
        "group inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5",
        "text-[13px] font-medium text-ink shadow-sm transition-colors hover:border-primary/40",
        !rule.active && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={onEdit}
        className="rounded-full text-left hover:text-primary"
        aria-label={`Edit ${formatTimeRange(rule.startLocal, rule.endLocal)}`}
      >
        {formatTimeRange(rule.startLocal, rule.endLocal)}
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="rounded p-0.5 text-ink-soft opacity-0 transition-opacity hover:bg-canvas hover:text-ink group-hover:opacity-100"
        aria-label="Edit hours"
      >
        <Pencil size={12} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        className="rounded p-0.5 text-ink-soft opacity-0 transition-opacity hover:bg-error-soft hover:text-error-foreground group-hover:opacity-100 disabled:opacity-40"
        aria-label="Remove hours"
      >
        <X size={12} aria-hidden />
      </button>
    </div>
  );
}

interface DayAddButtonProps {
  dayLabel: string;
  onClick: () => void;
}

export function DayAddButton({ dayLabel, onClick }: DayAddButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-8 w-8 shrink-0 rounded-full p-0 text-ink-soft hover:bg-primary-soft hover:text-primary"
      aria-label={`Add hours on ${dayLabel}`}
    >
      <Plus size={16} aria-hidden />
    </Button>
  );
}
