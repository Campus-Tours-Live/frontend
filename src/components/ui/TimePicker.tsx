"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDismiss } from "@/hooks";

/**
 * TimePicker — a time-of-day field with an iPhone-Clock-style infinite
 * scroll-wheel dropdown (CTL-55). Fully controlled: pass `value` (24h `"HH:mm"`,
 * or the `"24:00"` end-of-day sentinel when `midnightIsEndOfDay`) and
 * `onChange`, which emits the same 24h shape.
 *
 * Three columns: Hour (1–12, wraps), Minute (00–55 in 5-minute steps, wraps) and
 * AM/PM (2 values, no wrap). Clicking the displayed time text switches the field
 * into an inline text-input mode (type e.g. `9:30 AM` or `21:30`). Styling is
 * built entirely on the app's design tokens (see the `.tp-*` block in
 * globals.css); the clock icon uses the shared ghost-button hover treatment.
 *
 * jsdom cannot exercise real scroll/snap, so the scroll-recentre maths lives in
 * the pure exported helpers below (unit-tested directly); the infinite-scroll
 * *feel* needs manual/visual verification in a browser.
 */

// ---------------------------------------------------------------------------
// Pure value/model helpers (exported for unit testing — no DOM required).
// ---------------------------------------------------------------------------

/** The Hour column's options — "1".."12". */
export const HOUR_OPTIONS: string[] = Array.from({ length: 12 }, (_, i) => String(i + 1));

/** The Minute column's options — 5-minute steps "00","05",…,"55" (12 values). */
export const MINUTE_OPTIONS: string[] = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);

/** The AM/PM column's options. */
export const PERIOD_OPTIONS: string[] = ["AM", "PM"];

export interface TimeParts {
  hour12: number;
  minute: number;
  period: "AM" | "PM";
}

/** Positive modulo — keeps a wrapped scroll index in `[0, m)` for either direction. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Round a minute value to the nearest 5 (the picker's grid step). */
export function roundTo5(minute: number): number {
  return Math.round(minute / 5) * 5;
}

/**
 * Decompose a 24h `"HH:mm"` value (or the `"24:00"` end-of-day sentinel) into the
 * three column parts. `"24:00"` and `"00:00"` both render as 12:00 AM. Minutes are
 * snapped to the nearest 5 so an off-grid stored value still centres a wheel item.
 */
export function valueToParts(value: string, midnightIsEndOfDay: boolean): TimeParts {
  let total: number;
  if (value === "24:00") {
    total = midnightIsEndOfDay ? 1440 : 0;
  } else {
    const [h, m] = value.split(":").map(Number);
    total = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  }
  const norm = ((total % 1440) + 1440) % 1440; // 1440 (midnight) → 0 → 12:00 AM
  let hour24 = Math.floor(norm / 60);
  let minute = roundTo5(norm % 60);
  if (minute === 60) {
    minute = 0;
    hour24 = (hour24 + 1) % 24;
  }
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return { hour12, minute, period };
}

/**
 * Compose the three column parts back into a 24h `"HH:mm"` value. When
 * `midnightIsEndOfDay`, a 12:00 AM selection emits the `"24:00"` end-of-day
 * sentinel instead of the start-of-day `"00:00"`.
 */
export function partsToValue(parts: TimeParts, midnightIsEndOfDay: boolean): string {
  const { hour12, minute, period } = parts;
  let hour24: number;
  if (period === "AM") hour24 = hour12 === 12 ? 0 : hour12;
  else hour24 = hour12 === 12 ? 12 : hour12 + 12;
  if (midnightIsEndOfDay && hour24 === 0 && minute === 0) return "24:00";
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Format a value for the closed field, e.g. `"09:00"` → `"9:00 AM"`, `"24:00"` → `"12:00 AM"`. */
export function formatDisplay(value: string, midnightIsEndOfDay: boolean): string {
  const { hour12, minute, period } = valueToParts(value, midnightIsEndOfDay);
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

/**
 * Parse a user-typed time into a 24h `"HH:mm"` value (or `"24:00"`), or `null` if
 * unparseable. Accepts `h:mm AM/PM` (any case/spacing) and 24h `hh:mm` (incl. the
 * literal `24:00`). Minutes are rounded to the nearest 5. On a TO field
 * (`midnightIsEndOfDay`) a 12:00 AM / end-of-day result maps to `"24:00"`.
 */
export function parseTypedTime(input: string, midnightIsEndOfDay: boolean): string | null {
  const t = input.trim().toLowerCase();
  if (!t) return null;

  let hour: number;
  let minute: number;

  const m12 = /^(\d{1,2}):(\d{2})\s*(am|pm)$/.exec(t);
  const m24 = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (m12) {
    hour = Number(m12[1]);
    minute = Number(m12[2]);
    if (hour < 1 || hour > 12 || minute > 59) return null;
    const pm = m12[3] === "pm";
    if (hour === 12) hour = pm ? 12 : 0;
    else if (pm) hour += 12;
  } else if (m24) {
    hour = Number(m24[1]);
    minute = Number(m24[2]);
    if (minute > 59 || hour > 24 || (hour === 24 && minute !== 0)) return null;
  } else {
    return null;
  }

  const total = roundTo5(hour * 60 + minute);
  if (total >= 1440) return midnightIsEndOfDay ? "24:00" : "00:00";
  if (midnightIsEndOfDay && total === 0) return "24:00";
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Pure scroll-wheel maths (exported for unit testing — the recentre technique).
// ---------------------------------------------------------------------------

/** Fixed item height (px); container shows 5 items with the middle one centred. */
export const ITEM_HEIGHT = 34;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PAD = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;
/** Odd number of list copies for a wrapping column, so there's a buffer each side. */
export const WRAP_COPIES = 7;

/** The centred item's index in the repeated list, from a scroll offset. */
export function centeredIndex(scrollTop: number): number {
  return Math.round(scrollTop / ITEM_HEIGHT);
}

/**
 * For a wrapping column: if the centred index has drifted into the first or last
 * copy, return the equivalent index back in the middle band (same visible value,
 * so resetting `scrollTop` to it is invisible). Returns the input unchanged when
 * already safely in the middle.
 */
export function recenterIndex(index: number, optionCount: number, copies: number): number {
  const lowerBound = optionCount; // stay out of the first copy
  const upperBound = optionCount * (copies - 1); // …and the last copy
  let next = index;
  while (next < lowerBound) next += optionCount;
  while (next >= upperBound) next -= optionCount;
  return next;
}

/** The value at a (repeated-list) index — wraps for infinite columns, clamps otherwise. */
export function valueAt(index: number, options: string[], wrap: boolean): string {
  if (wrap) return options[mod(index, options.length)];
  const clamped = Math.min(options.length - 1, Math.max(0, index));
  return options[clamped];
}

// ---------------------------------------------------------------------------
// Scroll-wheel column (one per hr / min / AM-PM).
// ---------------------------------------------------------------------------

const SETTLE_MS = 90;

interface WheelColumnProps {
  label: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
  /** Infinite wrap (Hour/Minute) vs. a plain 2-item snap (AM/PM). */
  wrap: boolean;
}

function WheelColumn({ label, options, value, onChange, wrap }: WheelColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInit = useRef(false);

  const copies = wrap ? WRAP_COPIES : 1;
  const midStart = options.length * Math.floor(copies / 2);
  const selectedIndex = Math.max(0, options.indexOf(value));

  const repeated = useMemo(
    () => Array.from({ length: copies }, () => options).flat(),
    [copies, options],
  );

  // Centre the selected item once, when the column first mounts (the dropdown
  // remounts on every open, so this re-seeds each time it's shown).
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const el = ref.current;
    if (el) el.scrollTop = (midStart + selectedIndex) * ITEM_HEIGHT;
  });

  const emitFor = (rawIndex: number) => {
    const next = valueAt(rawIndex, options, wrap);
    if (next !== value) onChange(next);
  };

  const onScroll = () => {
    if (settleRef.current) clearTimeout(settleRef.current);
    settleRef.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const raw = centeredIndex(el.scrollTop);
      if (wrap) {
        const target = recenterIndex(raw, options.length, copies);
        if (target !== raw) el.scrollTop = target * ITEM_HEIGHT; // silent recentre
      }
      emitFor(raw);
    }, SETTLE_MS);
  };

  const selectOption = (optionIndex: number) => {
    const el = ref.current;
    if (el) el.scrollTop = (midStart + optionIndex) * ITEM_HEIGHT;
    const next = options[optionIndex];
    if (next !== value) onChange(next);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = wrap
      ? mod(selectedIndex + delta, options.length)
      : Math.min(options.length - 1, Math.max(0, selectedIndex + delta));
    selectOption(nextIndex);
  };

  return (
    <div
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="relative tp-wheel focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-soft rounded-field"
      style={{ height: CONTAINER_HEIGHT }}
    >
      <div className="tp-fade-top" aria-hidden />
      <div className="tp-band" aria-hidden style={{ height: ITEM_HEIGHT }} />
      <div className="tp-fade-bottom" aria-hidden />
      <div
        ref={ref}
        onScroll={onScroll}
        className="tp-col h-full overflow-y-auto"
        style={{ paddingTop: PAD, paddingBottom: PAD }}
      >
        {repeated.map((opt, i) => {
          const isSelected = i % options.length === selectedIndex;
          return (
            <button
              key={i}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => selectOption(i % options.length)}
              className={cn(
                "tp-item flex w-full items-center justify-center text-[15px] tabular-nums transition-colors",
                isSelected ? "font-bold text-primary" : "text-ink-soft",
              )}
              style={{ height: ITEM_HEIGHT }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TimePicker field + dropdown.
// ---------------------------------------------------------------------------

export interface TimePickerProps {
  /** 24h `"HH:mm"`; `"24:00"` = end-of-day when `midnightIsEndOfDay`. */
  value: string;
  /** Emits 24h `"HH:mm"` (or `"24:00"` for an end-of-day 12:00 AM). */
  onChange: (next: string) => void;
  /** TO-field mode: a 12:00 AM selection emits `"24:00"` (end of day). Default false. */
  midnightIsEndOfDay?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  id?: string;
}

export function TimePicker({
  value,
  onChange,
  midnightIsEndOfDay = false,
  disabled = false,
  "aria-label": ariaLabel,
  id,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useDismiss({
    enabled: open || editing,
    outside: true,
    ref: wrapperRef,
    onDismiss: () => {
      setOpen(false);
      setEditing(false);
    },
  });

  const parts = valueToParts(value, midnightIsEndOfDay);
  const display = formatDisplay(value, midnightIsEndOfDay);

  const setPart = (patch: Partial<TimeParts>) => {
    onChange(partsToValue({ ...parts, ...patch }, midnightIsEndOfDay));
  };

  const enterEdit = () => {
    if (disabled) return;
    setOpen(false);
    setDraft(display);
    setEditing(true);
  };

  const commitEdit = () => {
    const parsed = parseTypedTime(draft, midnightIsEndOfDay);
    if (parsed) onChange(parsed); // invalid → keep the previous value
    setEditing(false);
  };

  const onEditKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitEdit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setEditing(false); // cancel — revert to the previous value
    }
  };

  const onPopoverKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className={cn(
          "tp-field flex items-center gap-2",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {editing ? (
          <input
            id={id}
            type="text"
            autoFocus
            aria-label={ariaLabel}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onEditKeyDown}
            onBlur={commitEdit}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14.5px] text-ink outline-none"
          />
        ) : (
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-label={
              ariaLabel ? `${ariaLabel}: ${display}, edit as text` : `${display}, edit as text`
            }
            onClick={enterEdit}
            className="min-w-0 flex-1 cursor-text bg-transparent text-left text-[14.5px] text-ink"
          >
            {display}
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-label={ariaLabel ? `Open ${ariaLabel} picker` : "Open time picker"}
          onClick={() => {
            setEditing(false);
            setOpen((o) => !o);
          }}
          className="tp-icon-btn shrink-0"
        >
          <Clock size={16} strokeWidth={1.8} aria-hidden />
        </button>
      </div>

      {open && !disabled ? (
        <div className="tp-popover" onKeyDown={onPopoverKeyDown}>
          <WheelColumn
            label="Hour"
            options={HOUR_OPTIONS}
            value={String(parts.hour12)}
            onChange={(h) => setPart({ hour12: Number(h) })}
            wrap
          />
          <WheelColumn
            label="Minute"
            options={MINUTE_OPTIONS}
            value={String(parts.minute).padStart(2, "0")}
            onChange={(m) => setPart({ minute: Number(m) })}
            wrap
          />
          <WheelColumn
            label="AM/PM"
            options={PERIOD_OPTIONS}
            value={parts.period}
            onChange={(p) => setPart({ period: p as "AM" | "PM" })}
            wrap={false}
          />
        </div>
      ) : null}
    </div>
  );
}
