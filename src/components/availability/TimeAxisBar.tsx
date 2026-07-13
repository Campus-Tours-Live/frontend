"use client";

import { cn } from "@/lib/utils";

/**
 * TimeAxisBar — a small presentational time-of-day bar for the date-specific override
 * dry-run preview (CTL-55). It renders backend-provided windows as positioned coloured
 * segments across a shared time axis; it performs ONLY time→x mapping (a pure presentation
 * coordinate), never any availability math — trims/net windows are computed by Core and
 * passed in ready to render (FE-never-recomputes).
 *
 * Segment kinds → colour:
 *   available → green (`bg-success`)
 *   off       → hatched (`.calendar-hatch`, reused from the calendar) = "Time off"
 *   extra     → blue (`bg-primary`) = "Extra"
 */
export type TimeAxisSegmentKind = "available" | "off" | "extra";

export interface TimeAxisSegment {
  /** Minutes-of-day (0–1440) of the segment's start. */
  startMin: number;
  /** Minutes-of-day (0–1440) of the segment's end. */
  endMin: number;
  kind: TimeAxisSegmentKind;
  /** Human-readable from–to label (e.g. "9:00 AM – 11:00 AM"), surfaced via `title`. */
  label: string;
}

export interface TimeAxisTick {
  min: number;
  label: string;
}

/** Human name per segment kind — kept in sync with the legend. */
export const SEGMENT_NAME: Record<TimeAxisSegmentKind, string> = {
  available: "Available",
  off: "Time off",
  extra: "Extra",
};

const SEGMENT_CLASS: Record<TimeAxisSegmentKind, string> = {
  available: "bg-success",
  off: "calendar-hatch border border-border",
  extra: "bg-primary",
};

/** Map a minute-of-day to a percentage across [startMin, endMin], clamped to 0–100.
 *  Pure presentation math — not availability logic. */
export function minToPercent(min: number, startMin: number, endMin: number): number {
  const span = Math.max(1, endMin - startMin);
  const pct = ((min - startMin) / span) * 100;
  return Math.min(100, Math.max(0, pct));
}

export interface TimeAxisBarProps {
  /** Left-column label, e.g. "Now" / "After". */
  barLabel: string;
  /** Accessible name for the whole bar (e.g. "Current hours on 2026-07-20"). */
  ariaLabel: string;
  segments: TimeAxisSegment[];
  rangeStartMin: number;
  rangeEndMin: number;
}

/** One labelled bar (Now / After) of positioned segments. */
export function TimeAxisBar({
  barLabel,
  ariaLabel,
  segments,
  rangeStartMin,
  rangeEndMin,
}: TimeAxisBarProps) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[11px] font-medium text-ink-soft">{barLabel}</span>
      <div className="relative h-4 flex-1 overflow-hidden rounded bg-border/30">
        {segments.map((segment, index) => {
          const left = minToPercent(segment.startMin, rangeStartMin, rangeEndMin);
          const right = minToPercent(segment.endMin, rangeStartMin, rangeEndMin);
          const width = Math.max(1.5, right - left);
          return (
            <span
              key={`${segment.kind}-${segment.startMin}-${index}`}
              data-kind={segment.kind}
              title={`${SEGMENT_NAME[segment.kind]} · ${segment.label}`}
              className={cn("absolute inset-y-0 rounded-sm", SEGMENT_CLASS[segment.kind])}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

export interface TimeAxisProps {
  ticks: TimeAxisTick[];
  rangeStartMin: number;
  rangeEndMin: number;
}

/** The shared hour-tick label row under a Now/After bar pair. Decorative (aria-hidden) —
 *  the bars themselves carry the accessible segment titles. */
export function TimeAxis({ ticks, rangeStartMin, rangeEndMin }: TimeAxisProps) {
  return (
    <div className="relative ml-14 mt-1 h-4" aria-hidden>
      {ticks.map((tick) => (
        <span
          key={tick.min}
          className="absolute -translate-x-1/2 text-[10px] text-ink-soft"
          style={{ left: `${minToPercent(tick.min, rangeStartMin, rangeEndMin)}%` }}
        >
          {tick.label}
        </span>
      ))}
    </div>
  );
}

/** The colour legend shared by the preview. Rendered once under the bars. */
export function TimeAxisLegend() {
  const items: { kind: TimeAxisSegmentKind }[] = [
    { kind: "available" },
    { kind: "off" },
    { kind: "extra" },
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-soft">
      {items.map(({ kind }) => (
        <span key={kind} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn("inline-block h-3 w-3 rounded-sm", SEGMENT_CLASS[kind])}
          />
          {SEGMENT_NAME[kind]}
        </span>
      ))}
    </div>
  );
}
