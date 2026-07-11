"use client";

import { Alert, Card } from "@/components/ui";
import type { AvailabilityOccurrence, ResolvedAvailability } from "@/lib/data-access";
import { formatTimezoneLabel } from "@/lib/availability/timezones";

export interface ResolvedAvailabilityPreviewProps {
  resolved: ResolvedAvailability | undefined;
  /** The guide's booking-settings timezone — occurrences are UTC (`startAt`/`endAt`, `Z`-suffixed)
   *  and are rendered in this zone so the preview matches how the guide authored their schedule. */
  timezone: string;
}

function formatOccurrence(occurrence: AvailabilityOccurrence, timezone: string): string {
  const start = new Date(occurrence.startAt);
  const end = new Date(occurrence.endAt);
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
}

/**
 * The guide-facing "actual availability" preview — the backend-resolved (coalesced) read
 * (`GET /v1/availability`, CTL-56). This is the single source of truth for the merged view: it
 * renders `resolved.occurrences` **exactly as returned**, and never re-coalesces/merges the
 * guide's rules or exceptions itself (CTL-55 Task 4 locked data model). Also surfaces the
 * backend's DST gap-day notice so the guide isn't left wondering where a block went.
 */
export function ResolvedAvailabilityPreview({
  resolved,
  timezone,
}: ResolvedAvailabilityPreviewProps) {
  const occurrences = resolved?.occurrences ?? [];
  const dstGapDays = resolved?.dstGapDays ?? [];

  return (
    <Card role="region" aria-label="Actual availability">
      <h2 className="font-display text-[18px] font-bold text-ink">Actual availability</h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        What participants can actually book — your weekly hours and date-specific hours, combined
        and merged by the server, shown in {formatTimezoneLabel(timezone)}. This view is read-only;
        edit your rules or exceptions above to change it.
      </p>

      {dstGapDays.length > 0 ? (
        <Alert variant="warning" className="mt-3">
          Daylight-saving change on {dstGapDays.join(", ")} shifted or skipped part of your
          availability — double check those day(s).
        </Alert>
      ) : null}

      {occurrences.length === 0 ? (
        <p className="mt-4 text-[14px] text-ink-soft">No resolved availability yet.</p>
      ) : (
        <ul className="mt-4 space-y-2" aria-label="Resolved availability">
          {occurrences.map((occurrence, index) => (
            <li
              key={`${occurrence.startAt}-${occurrence.endAt}-${index}`}
              className="text-[14px] text-ink"
            >
              {formatOccurrence(occurrence, timezone)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
