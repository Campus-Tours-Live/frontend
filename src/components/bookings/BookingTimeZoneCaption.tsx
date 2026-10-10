"use client";

import { useSyncExternalStore } from "react";
import { Caption } from "@/components/ui";

const subscribe = () => () => {};
const getTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const getServerTimeZone = () => null;

/** Keep initial markup stable when the server and viewer use different timezones. */
export function BookingTimeZoneCaption() {
  const timeZone = useSyncExternalStore(subscribe, getTimeZone, getServerTimeZone);
  return (
    <Caption as="p" color="muted" className="break-words">
      {timeZone ? `Times shown in ${timeZone}` : "Times shown in your local timezone"}
    </Caption>
  );
}
