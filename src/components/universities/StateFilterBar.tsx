"use client";

import { Chip, VisuallyHidden } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * The two named filters, plus every letter that begins a state name.
 *
 * They share one value space because they are one control: at any moment exactly one of them is
 * what the list is showing. A separate "Popular" toggle beside a letter strip would let the user
 * pick two things that cannot both be true.
 *
 * A letter is a single uppercase character, so it can never collide with either word.
 */
export const POPULAR_FILTER = "popular";
export const ALL_FILTER = "all";

export interface StateFilterBarProps {
  className?: string;
  /** Letters that actually begin a state name, in order. */
  letters: readonly string[];
  value: string;
  onChange: (value: string) => void;
}

/** Every chip fills its grid cell, so a row's chips are the same width and its edges are flush. */
const CHIP = "min-h-11 w-full justify-center";

/**
 * The app's standard hover for a pill-shaped control — the same pair the pagination numbers, the
 * month picker's days and `IconButton`'s `soft` variant use. `.chip` ships a `transition-colors`
 * but no hover of its own, so without this the letters were the one control on the page that gave
 * no feedback under the pointer.
 *
 * Applied only when the chip is NOT pressed: a pressed chip is `bg-primary`, and a hover utility
 * would beat `.chip.active` on source order and wash it out mid-hover.
 */
const CHIP_HOVER =
  "hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-soft";

/**
 * StateFilterBar — the one control that decides what the state list shows.
 *
 * <p>Only letters with states behind them are offered. Seven of the twenty-six (B, E, J, Q, X, Y,
 * Z) begin no state name, and offering them either wastes a control or answers with an empty list,
 * which reads as a broken page rather than as "no state starts with Q". Dropping them removes the
 * empty state from the design entirely.
 *
 * A GRID of equal columns, not a wrapping row.
 *
 * Wrapping fitted as many fixed-width chips on a line as happened to go, so every row ended
 * wherever its last chip did — a ragged right edge beside a search field and a card grid that both
 * run flush to the panel's edge. Equal columns that stretch to `1fr` make each row span the full
 * width, so both edges line up on every row. `auto-fill` is what keeps that responsive: the column
 * count follows the panel's width rather than a breakpoint guess.
 *
 * It also has to WRAP rather than scroll, and that is not cosmetic. A `nowrap` row of twenty-one
 * chips that cannot shrink has a min-content width of about 1,040px, and that number does not stay
 * inside a scroller: every ancestor that is a flex or grid item refuses to be narrower than its
 * content, so it climbed the tree and made the whole page 1,040px wide on a 430px phone. `min-w-0`
 * on the ancestors is the textbook fix and belongs there regardless, but a grid whose columns are
 * `minmax(…, 1fr)` simply has no such minimum to propagate.
 */
export function StateFilterBar({ className, letters, value, onChange }: StateFilterBarProps) {
  return (
    <div className={cn(className)}>
      <ul
        aria-label="Filter states"
        // 2.75rem is the 44px touch floor; `1fr` lets the columns share out whatever is left so the
        // row ends flush. Cells never go below the floor, so a chip is always tappable.
        className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5"
      >
        {/* Two cells: "Popular" does not fit a 44px square, and forcing every cell to its width
            would waste most of the row on nineteen single characters. */}
        <li className="col-span-2">
          <Chip
            active={value === POPULAR_FILTER}
            onClick={() => onChange(POPULAR_FILTER)}
            className={cn(CHIP, "px-2", value !== POPULAR_FILTER && CHIP_HOVER)}
          >
            Popular
            <VisuallyHidden> states</VisuallyHidden>
          </Chip>
        </li>
        <li>
          <Chip
            active={value === ALL_FILTER}
            onClick={() => onChange(ALL_FILTER)}
            className={cn(CHIP, "px-1", value !== ALL_FILTER && CHIP_HOVER)}
          >
            All
            <VisuallyHidden> states</VisuallyHidden>
          </Chip>
        </li>

        {letters.map((letter) => (
          <li key={letter}>
            <Chip
              active={value === letter}
              onClick={() => onChange(letter)}
              className={cn(CHIP, "px-0", value !== letter && CHIP_HOVER)}
            >
              {letter}
              <VisuallyHidden> — states starting with {letter}</VisuallyHidden>
            </Chip>
          </li>
        ))}
      </ul>
    </div>
  );
}
