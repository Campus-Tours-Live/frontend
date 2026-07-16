"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover } from "../overlays/Popover";
import { Icon } from "../utils/Icon";
import { cn } from "@/lib/utils";

/**
 * MonthYearPicker — a reusable month/year navigator (CTL-55). Closed state is a
 * `‹ {Month} {Year} ▾ ›` row with properly-sized icon buttons (replaces the old
 * cramped inline chevrons); clicking the label opens a grid-popover (built on the
 * shared `Popover`) with a year stepper and a 3×4 grid of months for jumping
 * straight to any month/year, instead of only stepping one month at a time.
 *
 * Fully controlled: `value` is any Date within the displayed month; `onChange`
 * always receives a normalized month-start Date (day 1, local midnight).
 */

export interface MonthYearPickerProps {
  /** A date at/within the displayed month. */
  value: Date;
  /** Called with the next month's start (day 1). */
  onChange: (nextMonthStart: Date) => void;
  disabled?: boolean;
  "aria-label"?: string;
  id?: string;
}

const MONTH_NAMES_LONG = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(2000, i, 1)),
);
const MONTH_NAMES_SHORT = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(2000, i, 1)),
);

/** Sane bounds for the typed year input — comfortably wide, but rejects garbage. */
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

/** Month-start arithmetic (day 1, local time) — pure date math, no availability logic. */
function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function monthStart(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex, 1);
}

/** Parses a typed year: digits only, within [MIN_YEAR, MAX_YEAR]. Empty/garbage/out-of-range → null
 *  (caller reverts to the last valid year rather than committing garbage). */
export function parseYear(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (parsed < MIN_YEAR || parsed > MAX_YEAR) return null;
  return parsed;
}

interface YearInputProps {
  year: number;
  onCommit: (nextYear: number) => void;
}

/**
 * The year field inside the popover — typeable (not just steppable). Holds a local
 * `draft` string while focused so keystrokes aren't fought by the reformatted
 * controlled value; on blur/Enter, a valid typed year commits via `onCommit`, and
 * an invalid/empty one silently reverts to the last valid `year` prop (never commits
 * garbage). Remounts each time the popover opens (it lives inside `Popover`, which
 * unmounts its children while closed), so there's no stale draft to reset.
 */
function YearInput({ year, onCommit }: YearInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const parsed = parseYear(raw);
    if (parsed !== null) onCommit(parsed);
    setDraft(null); // revert the field's own text to the (possibly just-committed) year
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label="Year"
      value={draft ?? String(year)}
      className="w-14 rounded bg-transparent text-center text-[14px] font-semibold text-ink outline-none tabular-nums focus:bg-primary-soft focus:text-primary-dark"
      onFocus={(event) => {
        setDraft(String(year));
        event.currentTarget.select();
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          // Bail out without committing; let the popover's own Escape handler close it.
          setDraft(null);
        }
      }}
    />
  );
}

export function MonthYearPicker({
  value,
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
  id,
}: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  // Captured via a callback ref (not a plain useRef) so Popover — which reads
  // `anchorEl` as a prop — re-renders once the label button mounts.
  const [labelEl, setLabelEl] = useState<HTMLButtonElement | null>(null);

  const currentYear = value.getFullYear();
  const currentMonth = value.getMonth();
  const label = `${MONTH_NAMES_LONG[currentMonth]} ${currentYear}`;

  const closePicker = () => setOpen(false);

  // The year controls navigate immediately, exactly like the outer ‹/› month chevrons:
  // changing the year jumps to the SAME month in the new year via `onChange`, so the
  // calendar follows at once instead of only moving when a month cell is clicked. The
  // popover stays open so the guide can still fine-tune the month afterwards. Because the
  // picker is fully controlled, the shown year is always `value`'s year — there is no
  // separate draft year to fall out of sync.
  const goToYear = (nextYear: number) => onChange(monthStart(nextYear, currentMonth));

  const pickMonth = (monthIndex: number) => {
    onChange(monthStart(currentYear, monthIndex));
    closePicker();
  };

  return (
    <div role="group" aria-label={ariaLabel} className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label="Previous month"
        disabled={disabled}
        onClick={() => onChange(addMonths(value, -1))}
        className="tp-icon-btn p-2"
      >
        <Icon icon={ChevronLeft} size={18} />
      </button>

      <button
        type="button"
        ref={setLabelEl}
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? closePicker() : setOpen(true))}
        // `min-w` holds a stable width for the widest label ("September 2026") and
        // `justify-center` centers the text, so stepping months never makes the label
        // grow/shrink and shove the ‹/› chevrons around.
        className="tp-icon-btn flex min-w-[9.5rem] items-center justify-center gap-1 px-2.5 py-2 text-[14px] font-semibold text-ink"
      >
        {label}
      </button>

      <button
        type="button"
        aria-label="Next month"
        disabled={disabled}
        onClick={() => onChange(addMonths(value, 1))}
        className="tp-icon-btn p-2"
      >
        <Icon icon={ChevronRight} size={18} />
      </button>

      <Popover
        open={open}
        anchorEl={labelEl}
        onClose={closePicker}
        aria-label={ariaLabel ? `${ariaLabel} picker` : "Month picker"}
        className="w-64"
      >
        <div className="rounded-card border border-border bg-popover p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous year"
              onClick={() => goToYear(currentYear - 1)}
              className="tp-icon-btn"
            >
              <Icon icon={ChevronLeft} size={16} />
            </button>
            <YearInput year={currentYear} onCommit={goToYear} />
            <button
              type="button"
              aria-label="Next year"
              onClick={() => goToYear(currentYear + 1)}
              className="tp-icon-btn"
            >
              <Icon icon={ChevronRight} size={16} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {MONTH_NAMES_SHORT.map((monthShort, monthIndex) => {
              // Highlight follows value's MONTH, so navigating the year keeps the same
              // month lit up (e.g. value = Jul 2026 → "Jul" stays highlighted once the
              // guide steps to 2027, which navigates to Jul 2027).
              const selected = monthIndex === currentMonth;
              return (
                <button
                  key={monthShort}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${MONTH_NAMES_LONG[monthIndex]} ${currentYear}`}
                  onClick={() => pickMonth(monthIndex)}
                  className={cn(
                    "rounded px-2 py-1.5 text-[13px] font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-soft",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "text-ink-soft hover:bg-primary-soft hover:text-primary",
                  )}
                >
                  {monthShort}
                </button>
              );
            })}
          </div>
        </div>
      </Popover>
    </div>
  );
}
