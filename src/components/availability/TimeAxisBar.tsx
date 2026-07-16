"use client";

import { cn } from "@/lib/utils";
import { Caption } from "@/components/ui";

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

/**
 * Resolve the axis domain [start, end] for a bar. An explicit caller-supplied domain
 * (`domainStartMin`/`domainEndMin`, falling back to the legacy `rangeStartMin`/`rangeEndMin`)
 * always wins so a Now/After pair can share ONE range that covers every slot; when none is given
 * the bar self-derives its range from its own segments (padded to whole hours) so it stays usable
 * standalone (backward-compatible). Pure presentation math — never availability logic.
 */
export function resolveAxisDomain(
  segments: TimeAxisSegment[],
  domainStartMin: number | undefined,
  domainEndMin: number | undefined,
): { startMin: number; endMin: number } {
  if (domainStartMin !== undefined && domainEndMin !== undefined) {
    return { startMin: domainStartMin, endMin: domainEndMin };
  }
  const mins = segments.flatMap((s) => [s.startMin, s.endMin]);
  if (mins.length === 0) return { startMin: 0, endMin: 1440 };
  const startMin = Math.floor(Math.min(...mins) / 60) * 60;
  let endMin = Math.ceil(Math.max(...mins) / 60) * 60;
  if (endMin <= startMin) endMin = startMin + 60;
  return { startMin, endMin };
}

export interface TimeAxisBarProps {
  /** Left-column label, e.g. "Now" / "After". */
  barLabel: string;
  /** Accessible name for the whole bar (e.g. "Current hours on 2026-07-20"). */
  ariaLabel: string;
  segments: TimeAxisSegment[];
  /** Explicit axis domain (minutes-of-day) — the CALLER's shared range across a Now/After pair.
   *  Preferred over the legacy `rangeStartMin`/`rangeEndMin`; when both are absent the bar
   *  self-derives its range from its own segments. */
  domainStartMin?: number;
  domainEndMin?: number;
  /** @deprecated legacy alias for `domainStartMin`/`domainEndMin` — kept so existing callers/tests
   *  keep working. */
  rangeStartMin?: number;
  rangeEndMin?: number;
}

/** One labelled bar (Now / After) of positioned segments. */
export function TimeAxisBar({
  barLabel,
  ariaLabel,
  segments,
  domainStartMin,
  domainEndMin,
  rangeStartMin,
  rangeEndMin,
}: TimeAxisBarProps) {
  const { startMin, endMin } = resolveAxisDomain(
    segments,
    domainStartMin ?? rangeStartMin,
    domainEndMin ?? rangeEndMin,
  );
  return (
    <div role="group" aria-label={ariaLabel} className="flex items-center gap-2">
      <Caption size="xs" weight={500} className="w-12 shrink-0">
        {barLabel}
      </Caption>
      <div className="relative h-4 flex-1 overflow-hidden rounded bg-border/30">
        {segments.map((segment, index) => {
          const left = minToPercent(segment.startMin, startMin, endMin);
          const right = minToPercent(segment.endMin, startMin, endMin);
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

/** Horizontal alignment for one tick label, keyed off its position in the range: the first tick
 *  (left ≈ 0%) left-aligns so it sits inside the left edge, the last tick (left ≈ 100%)
 *  right-aligns so it sits inside the right edge, and every tick in between stays centered on its
 *  mark. Centering EVERY label (the old behaviour) pushed half of the first/last label past the
 *  container's edge, wrapping it onto a second line (e.g. "12:00 PM" / "12:00 AM"). */
function tickTranslateClass(min: number, rangeStartMin: number, rangeEndMin: number): string {
  if (min <= rangeStartMin) return "translate-x-0";
  if (min >= rangeEndMin) return "-translate-x-full";
  return "-translate-x-1/2";
}

/** The shared hour-tick label row under a Now/After bar pair. Decorative (aria-hidden) —
 *  the bars themselves carry the accessible segment titles. */
export function TimeAxis({ ticks, rangeStartMin, rangeEndMin }: TimeAxisProps) {
  return (
    <div className="relative ml-14 mt-1 h-4" aria-hidden>
      {ticks.map((tick) => (
        <Caption
          as="span"
          size="xxs"
          key={tick.min}
          className={cn(
            "absolute whitespace-nowrap",
            tickTranslateClass(tick.min, rangeStartMin, rangeEndMin),
          )}
          style={{ left: `${minToPercent(tick.min, rangeStartMin, rangeEndMin)}%` }}
        >
          {tick.label}
        </Caption>
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
    <Caption as="div" size="xs" className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map(({ kind }) => (
        <span key={kind} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn("inline-block h-3 w-3 rounded-sm", SEGMENT_CLASS[kind])}
          />
          {SEGMENT_NAME[kind]}
        </span>
      ))}
    </Caption>
  );
}
