"use client";

import { Body, Caption, StatusBadge } from "@/components/ui";
import type { GuideBookingStatusEvent } from "@/lib/data-access";
import {
  bookingActorLabel,
  bookingStatusEventLabel,
  bookingStatusLabel,
  bookingStatusVariant,
  formatStatusEventWhen,
} from "./bookingDisplay";

export interface GuideBookingStatusTimelineProps {
  events: GuideBookingStatusEvent[];
}

export function GuideBookingStatusTimeline({ events }: GuideBookingStatusTimelineProps) {
  if (events.length === 0) {
    return (
      <Body size="small" color="muted">
        No status history yet.
      </Body>
    );
  }

  return (
    <ol className="space-y-4">
      {[...events].reverse().map((event, index) => (
        <li key={`${event.occurredAt}-${index}`} className="flex gap-3">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Body size="small" weight={600}>
                {bookingStatusEventLabel(event.reasonCode)}
              </Body>
              <StatusBadge variant={bookingStatusVariant(event.status)}>
                {bookingStatusLabel(event.status)}
              </StatusBadge>
            </div>
            <Caption as="p" color="muted">
              {bookingActorLabel(event.actor)} ·{" "}
              <time dateTime={event.occurredAt}>{formatStatusEventWhen(event.occurredAt)}</time>
            </Caption>
          </div>
        </li>
      ))}
    </ol>
  );
}
