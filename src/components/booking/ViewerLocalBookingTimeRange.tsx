"use client";

import { useEffect, useMemo, useState } from "react";
import * as bookingTime from "@/lib/bookingTime";

export interface ViewerLocalBookingTimeRangeProps {
  scheduledStartAt: string | null | undefined;
  scheduledEndAt: string | null | undefined;
  className?: string;
  placeholder?: string;
}

const TIMEZONE_POLL_MS = 60_000;

export function ViewerLocalBookingTimeRange({
  scheduledStartAt,
  scheduledEndAt,
  className,
  placeholder = bookingTime.BOOKING_TIME_PLACEHOLDER,
}: ViewerLocalBookingTimeRangeProps) {
  const [timeZone, setTimeZone] = useState<string | null>(null);

  useEffect(() => {
    const refreshTimeZone = () => {
      const next = bookingTime.getViewerTimeZone();
      setTimeZone((current) => (current === next ? current : next));
    };

    refreshTimeZone();
    const intervalId = window.setInterval(refreshTimeZone, TIMEZONE_POLL_MS);
    window.addEventListener("focus", refreshTimeZone);
    window.addEventListener("pageshow", refreshTimeZone);
    document.addEventListener("visibilitychange", refreshTimeZone);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshTimeZone);
      window.removeEventListener("pageshow", refreshTimeZone);
      document.removeEventListener("visibilitychange", refreshTimeZone);
    };
  }, []);

  const label = useMemo(() => {
    if (!timeZone) return placeholder;
    const formatted = bookingTime.formatViewerLocalBookingTimeRange(
      { scheduledStartAt, scheduledEndAt },
      timeZone,
    );
    return formatted === bookingTime.BOOKING_TIME_PLACEHOLDER ? placeholder : formatted;
  }, [placeholder, scheduledEndAt, scheduledStartAt, timeZone]);

  return (
    <time dateTime={scheduledStartAt ?? undefined} className={className} suppressHydrationWarning>
      {label}
    </time>
  );
}
