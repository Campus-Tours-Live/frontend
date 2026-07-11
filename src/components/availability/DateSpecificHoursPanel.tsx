"use client";

import { CalendarOff, CalendarPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Card, StatusBadge } from "@/components/ui";
import type { AvailabilityException } from "@/lib/data-access";
import { formatWindow } from "@/lib/availability/duration";
import { formatExceptionDate } from "./availabilityHelpers";
import { EXCEPTION_KIND_LABELS } from "./ExceptionFormModal";

export interface DateSpecificHoursPanelProps {
  exceptions: AvailabilityException[];
  onAdd: () => void;
  onEdit: (exception: AvailabilityException) => void;
  onRemove: (exception: AvailabilityException) => void;
  removingId?: string | null;
}

/**
 * Date-specific hours list — one bar per exception (UNAVAILABLE blocks time off, ADDITIONAL adds
 * extra availability), each showing its date + start/duration window via `formatWindow`. Like
 * `WeeklySchedulePanel`, this never merges entries — the resolved/"actual availability" view is
 * the backend read, rendered separately.
 */
export function DateSpecificHoursPanel({
  exceptions,
  onAdd,
  onEdit,
  onRemove,
  removingId,
}: DateSpecificHoursPanelProps) {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="font-display text-[20px] font-bold text-ink">Date-specific hours</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Override your weekly schedule for a single date — block time off or add extra
            availability.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onAdd} className="shrink-0">
          <Plus size={14} className="mr-1.5" aria-hidden />
          Add date-specific hours
        </Button>
      </div>

      {exceptions.length === 0 ? (
        <div className="px-5 py-10 text-center sm:px-6">
          <p className="text-[14px] text-ink-soft">
            No date-specific hours yet. Use this when your weekly schedule does not apply.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border" aria-label="Date-specific hours">
          {exceptions.map((exception) => {
            const isExtra = exception.kind === "ADDITIONAL";
            const Icon = isExtra ? CalendarPlus : CalendarOff;
            const window = formatWindow(exception.startLocal, exception.windowMin);

            return (
              <li
                key={exception.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={
                      isExtra
                        ? "mt-0.5 rounded-full bg-success-soft p-2 text-success-foreground"
                        : "mt-0.5 rounded-full bg-error-soft p-2 text-error-foreground"
                    }
                  >
                    <Icon size={16} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-ink">
                        {formatExceptionDate(exception.exceptionDate)}
                      </span>
                      <StatusBadge variant={isExtra ? "success" : "error"}>
                        {EXCEPTION_KIND_LABELS[exception.kind]}
                      </StatusBadge>
                    </div>
                    <p className="mt-0.5 text-[13px] text-ink-soft">{window}</p>
                    {exception.reason ? (
                      <p className="mt-0.5 text-[13px] text-ink-soft">{exception.reason}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 gap-1 sm:ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(exception)}
                    aria-label="Edit date-specific hours"
                  >
                    <Pencil size={14} aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(exception)}
                    disabled={removingId === exception.id}
                    aria-label="Remove date-specific hours"
                  >
                    <Trash2 size={14} aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
