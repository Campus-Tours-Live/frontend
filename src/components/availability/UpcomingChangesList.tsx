"use client";

import { Badge, Card, StatusBadge } from "@/components/ui";
import {
  useAvailabilityExceptions,
  useResolvedAvailability,
  type AvailabilityException,
  type AvailabilityExceptionKind,
} from "@/lib/data-access";
import { formatFromTo } from "@/lib/availability/fromTo";
import { formatExceptionDate } from "./availabilityHelpers";

/** Local labels/variants for the two exception kinds — deliberately not shared with any form
 *  component so this list doesn't couple to modal-specific label copy. */
const KIND_LABEL: Record<AvailabilityExceptionKind, string> = {
  UNAVAILABLE: "Blocked",
  ADDITIONAL: "Extra",
};

const KIND_BADGE_VARIANT: Record<AvailabilityExceptionKind, "coral" | "sage"> = {
  UNAVAILABLE: "coral",
  ADDITIONAL: "sage",
};

interface DstChangeEntry {
  type: "dst";
  date: string;
}
interface ExceptionChangeEntry {
  type: "exception";
  exception: AvailabilityException;
}
type ChangeEntry = DstChangeEntry | ExceptionChangeEntry;

function entryDate(entry: ChangeEntry): string {
  return entry.type === "dst" ? entry.date : entry.exception.exceptionDate;
}

/**
 * Upcoming-changes list (CTL-55 v2.1) — a simple scannable list built entirely from
 * backend-resolved data: `dstGapDays` (from `useResolvedAvailability`) rendered as DST notices,
 * and the guide's exceptions (from `useAvailabilityExceptions`) rendered as vacation/extra
 * entries with date + kind badge + from–to. Deriving "blocked vs baseline" is a backend concern —
 * this component only renders what the backend returns, never recomputing it.
 */
export function UpcomingChangesList() {
  const resolvedQuery = useResolvedAvailability();
  const exceptionsQuery = useAvailabilityExceptions();

  const dstGapDays = resolvedQuery.data?.dstGapDays ?? [];
  const exceptions = exceptionsQuery.data ?? [];

  const entries: ChangeEntry[] = [
    ...dstGapDays.map((date): ChangeEntry => ({ type: "dst", date })),
    ...exceptions.map((exception): ChangeEntry => ({ type: "exception", exception })),
  ].sort((a, b) => entryDate(a).localeCompare(entryDate(b)));

  return (
    <Card role="region" aria-label="Upcoming changes">
      <h2 className="font-display text-[18px] font-bold text-ink">Upcoming changes</h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        Daylight-saving notices and your date-specific overrides, exactly as the server resolves
        them.
      </p>

      {entries.length === 0 ? (
        <p className="mt-4 text-[14px] text-ink-soft">No upcoming changes.</p>
      ) : (
        <ul className="mt-4 space-y-2" aria-label="Upcoming changes list">
          {entries.map((entry) =>
            entry.type === "dst" ? (
              <li
                key={`dst-${entry.date}`}
                className="flex flex-wrap items-center gap-2 text-[14px] text-ink"
              >
                <StatusBadge variant="warning">DST</StatusBadge>
                <span>
                  Daylight-saving change on {entry.date} may have shifted or skipped part of that
                  day&apos;s availability.
                </span>
              </li>
            ) : (
              <li
                key={entry.exception.id}
                className="flex flex-wrap items-center gap-2 text-[14px] text-ink"
              >
                <Badge variant={KIND_BADGE_VARIANT[entry.exception.kind]}>
                  {KIND_LABEL[entry.exception.kind]}
                </Badge>
                <span className="font-semibold">
                  {formatExceptionDate(entry.exception.exceptionDate)}
                </span>
                <span className="text-ink-soft">
                  {formatFromTo(entry.exception.startLocal, entry.exception.windowMin)}
                </span>
              </li>
            ),
          )}
        </ul>
      )}
    </Card>
  );
}
