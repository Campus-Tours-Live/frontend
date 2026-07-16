"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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
 * Parse what the user has typed into the Hour segment into a 1–12 hour, or `null`
 * (keep the previous value). Only the last two digits count, so continuous typing
 * shifts (e.g. `"1"` then `"2"` → 12). Off-range (0, >12) → `null`.
 */
export function parseHourSegment(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const n = parseInt(digits.slice(-2), 10);
  return n >= 1 && n <= 12 ? n : null;
}

/**
 * Parse what the user has typed into the Minute segment into a 0–55 value snapped
 * to the 5-minute grid, or `null` (keep the previous value). Only the last two
 * digits count; >59 → `null`.
 */
export function parseMinuteSegment(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const n = parseInt(digits.slice(-2), 10);
  if (n < 0 || n > 59) return null;
  return Math.min(55, roundTo5(n));
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

/** Approx. popover box size (px), for viewport flip/clamp positioning. Container +
 *  the `.tp-popover` padding/border; width = 3 columns + gaps + padding. */
const POPOVER_HEIGHT = CONTAINER_HEIGHT + 20;
const POPOVER_WIDTH = 236;
const MARGIN = 8;

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
  // `true` while WE are updating the value (scroll/click), so the value→scroll
  // sync effect below doesn't fight the user's own gesture (which would jump).
  const selfEmitRef = useRef(false);

  const copies = wrap ? WRAP_COPIES : 1;
  const midStart = options.length * Math.floor(copies / 2);
  const selectedIndex = Math.max(0, options.indexOf(value));

  // The repeated-list index currently under the centre band. Tracked in state so
  // the highlight follows the finger LIVE (no wait for the debounced commit → no
  // lag/flash as the wheel crosses 12→1 / 55→00), and in a ref for the handlers.
  const [activeIndex, setActiveIndex] = useState(midStart + selectedIndex);
  const activeIndexRef = useRef(activeIndex);
  const setActive = (index: number) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
  };

  const repeated = useMemo(
    () => Array.from({ length: copies }, () => options).flat(),
    [copies, options],
  );

  const scrollToIndex = (index: number) => {
    const el = ref.current;
    if (el) el.scrollTop = index * ITEM_HEIGHT;
    setActive(index);
  };

  // Seed the scroll position on mount, and re-seed if the value changes from the
  // OUTSIDE (e.g. typing in a segment) — but never in response to our own emit,
  // which would yank the wheel back mid-scroll.
  useEffect(() => {
    if (selfEmitRef.current) {
      selfEmitRef.current = false;
      return;
    }
    scrollToIndex(midStart + Math.max(0, options.indexOf(value)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (rawIndex: number) => {
    const next = valueAt(rawIndex, options, wrap);
    if (next !== value) {
      selfEmitRef.current = true;
      onChange(next);
    }
  };

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    let raw = centeredIndex(el.scrollTop);
    if (wrap) {
      // Recentre WHILE scrolling (not on settle): repositioning by whole identical
      // copies is invisible and momentum continues seamlessly — no edge flash.
      const target = recenterIndex(raw, options.length, copies);
      if (target !== raw) {
        el.scrollTop = target * ITEM_HEIGHT;
        raw = target;
      }
    } else {
      raw = Math.min(options.length - 1, Math.max(0, raw));
    }
    if (raw !== activeIndexRef.current) setActive(raw); // live highlight
    if (settleRef.current) clearTimeout(settleRef.current);
    settleRef.current = setTimeout(() => emit(raw), SETTLE_MS); // commit on settle
  };

  const selectOption = (optionIndex: number) => {
    scrollToIndex(midStart + optionIndex);
    const next = options[optionIndex];
    if (next !== value) {
      selfEmitRef.current = true;
      onChange(next);
    }
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
          const isSelected = i === activeIndex; // exactly the item under the band
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
// Editable segment (one of hour / minute / AM-PM in the closed field).
// ---------------------------------------------------------------------------

interface SegmentProps {
  ariaLabel: string;
  /** The current value shown when the segment isn't being typed into. */
  display: string;
  /** Fixed width (e.g. "2ch") so the field never resizes as digits change. */
  width: string;
  disabled?: boolean;
  /** Period segment: key-driven only (a/p, arrows) — no free-text entry. */
  readOnly?: boolean;
  id?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Live parse+emit for hour/minute as the user types. */
  onCommit?: (raw: string) => void;
  /** Arrow Up/Down steps the segment. */
  onStep: (dir: 1 | -1) => void;
  /** Period letter key (a/p). */
  onChar?: (key: string) => void;
}

/**
 * One inline, independently-focusable segment. Clicking a segment lands the caret
 * IN that segment (each is its own `<input>`), and the fixed width keeps the field
 * from resizing. A local `draft` holds the raw text while focused so typing isn't
 * fought by the reformatted controlled `display`.
 */
function Segment({
  ariaLabel,
  display,
  width,
  disabled,
  readOnly,
  id,
  inputRef,
  onCommit,
  onStep,
  onChar,
}: SegmentProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = readOnly ? display : (draft ?? display);
  return (
    <input
      id={id}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={ariaLabel}
      disabled={disabled}
      readOnly={readOnly}
      value={shown}
      style={{ width }}
      className="tp-seg"
      onFocus={(e) => {
        if (!readOnly) setDraft(display);
        e.currentTarget.select();
      }}
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        if (readOnly) return;
        setDraft(e.target.value);
        onCommit?.(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          // Drop the typing draft so the stepped value shows immediately — otherwise the draft set
          // on focus keeps masking the controlled `display` (why arrows looked dead on hr/min but
          // not on the readOnly AM/PM segment).
          setDraft(null);
          onStep(1);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setDraft(null);
          onStep(-1);
        } else if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (onChar && /^[a-zA-Z]$/.test(e.key)) {
          e.preventDefault();
          onChar(e.key);
        }
      }}
    />
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
  /** On first mount, open the dropdown and focus the Hour segment (e.g. a freshly
   *  added range row). Read once on mount. */
  openOnMount?: boolean;
  "aria-label"?: string;
  id?: string;
}

export function TimePicker({
  value,
  onChange,
  midnightIsEndOfDay = false,
  disabled = false,
  openOnMount = false,
  "aria-label": ariaLabel,
  id,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  // Fixed-viewport position for the portaled popover, so no scrolling/overflow
  // ancestor (the modal's scroll area) can clip it as rows pile up. Flipped above
  // the field and clamped to the viewport so it never runs off-screen / out of the
  // modal's visible area.
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  // Set when the dropdown should grab focus on the Hour wheel once it renders.
  const focusHourWheelRef = useRef(false);

  const computePos = (): { left: number; top: number } | null => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const gap = 4;
    const flipUp =
      rect.bottom + POPOVER_HEIGHT + gap > window.innerHeight &&
      rect.top - POPOVER_HEIGHT - gap > 0;
    // Round to whole pixels: sub-pixel `getBoundingClientRect` jitter would otherwise churn `setPos`
    // (and re-seed the wheels) on every reposition.
    const left = Math.round(
      Math.max(MARGIN, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - MARGIN)),
    );
    const top = Math.round(flipUp ? rect.top - POPOVER_HEIGHT - gap : rect.bottom + gap);
    return { left, top };
  };

  const positionPopover = () => {
    const next = computePos();
    if (!next) return;
    // Bail out (same reference) when nothing moved, so a reposition event that didn't shift the
    // field costs no re-render.
    setPos((prev) => (prev && prev.left === next.left && prev.top === next.top ? prev : next));
  };

  const openPicker = () => {
    positionPopover();
    setOpen(true);
  };

  // Close on outside pointer / Escape, and keep the fixed popover pinned to the field.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrapperRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = (e: Event) => {
      // Reposition when an ANCESTOR (the modal) scrolls — but ignore the wheel's own inner scroll.
      if (popoverRef.current?.contains(e.target as Node)) return;
      positionPopover();
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", onScroll, true);

    // Reposition on REFLOW too: when the dialog grows (a dry-run notice appears) its `items-center`
    // panel re-centres and moves the field WITHOUT firing scroll/resize. A ResizeObserver on the
    // field's ancestors catches the panel's size change and re-pins the popover — firing only on an
    // actual size change (not every frame), so there's no jitter. Guard for jsdom (no ResizeObserver).
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => positionPopover());
      for (let el = wrapperRef.current?.parentElement; el; el = el.parentElement) ro.observe(el);
    }

    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", onScroll, true);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Once the dropdown is open, move focus to the Hour wheel if requested (e.g. a
  // freshly-added row) — the wheel is portaled, so focus it after it renders.
  useEffect(() => {
    if (!open || !focusHourWheelRef.current) return;
    focusHourWheelRef.current = false;
    const hourWheel = popoverRef.current?.querySelector<HTMLElement>('[role="listbox"]');
    hourWheel?.focus();
  }, [open]);

  // Freshly-added row: pop the dropdown open and focus the Hour wheel. Opening
  // on mount is intentional imperative behaviour (not derived state).
  useEffect(() => {
    if (!openOnMount || disabled) return;
    focusHourWheelRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    openPicker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parts = valueToParts(value, midnightIsEndOfDay);
  const segLabel = (part: string) => (ariaLabel ? `${ariaLabel} ${part}` : part);

  const setPart = (patch: Partial<TimeParts>) => {
    onChange(partsToValue({ ...parts, ...patch }, midnightIsEndOfDay));
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
        <div role="group" aria-label={ariaLabel} className="flex flex-1 items-center gap-0.5">
          <Segment
            id={id}
            inputRef={hourRef}
            ariaLabel={segLabel("hour")}
            display={String(parts.hour12)}
            width="2ch"
            disabled={disabled}
            onCommit={(raw) => {
              const h = parseHourSegment(raw);
              if (h !== null) setPart({ hour12: h });
            }}
            onStep={(d) => setPart({ hour12: ((parts.hour12 - 1 + d + 12) % 12) + 1 })}
          />
          <span aria-hidden className="text-ink-soft">
            :
          </span>
          <Segment
            ariaLabel={segLabel("minutes")}
            display={String(parts.minute).padStart(2, "0")}
            width="2ch"
            disabled={disabled}
            onCommit={(raw) => {
              const m = parseMinuteSegment(raw);
              if (m !== null) setPart({ minute: m });
            }}
            onStep={(d) => setPart({ minute: mod(parts.minute + d * 5, 60) })}
          />
          <Segment
            ariaLabel={segLabel("AM/PM")}
            display={parts.period}
            width="2.75ch"
            disabled={disabled}
            readOnly
            onStep={() => setPart({ period: parts.period === "AM" ? "PM" : "AM" })}
            onChar={(key) => {
              const k = key.toLowerCase();
              if (k === "a") setPart({ period: "AM" });
              else if (k === "p") setPart({ period: "PM" });
            }}
          />
        </div>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-label={ariaLabel ? `Open ${ariaLabel} picker` : "Open time picker"}
          onClick={() => (open ? setOpen(false) : openPicker())}
          className="tp-icon-btn shrink-0"
        >
          <Clock size={16} strokeWidth={1.8} aria-hidden />
        </button>
      </div>

      {open && !disabled && pos
        ? createPortal(
            <div
              ref={popoverRef}
              className="tp-popover"
              style={{ position: "fixed", left: pos.left, top: pos.top }}
              onKeyDown={onPopoverKeyDown}
            >
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
