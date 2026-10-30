"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

// Shows a date and time in the visitor's own time zone. The server doesn't know
// the visitor's zone, so it first renders UTC and the browser then swaps in the
// local time (using useSyncExternalStore avoids a hydration mismatch).
export function LocalTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noSubscribe,
    () => format(iso),
    () => format(iso, "UTC")
  );
  return <time dateTime={iso}>{text}</time>;
}

function format(iso: string, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone }).format(
    new Date(iso)
  );
}
