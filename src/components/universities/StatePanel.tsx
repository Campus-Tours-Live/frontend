"use client";

import { useMemo, useRef, useState } from "react";
import { Body, Caption, Icon, IconButton, Pagination, Skeleton, TextField } from "@/components/ui";
import { useUniversityCounts } from "@/lib/data-access";
import { cn } from "@/lib/utils";
import { ALL_FILTER, POPULAR_FILTER, StateFilterBar } from "./StateFilterBar";
import { US_STATES, type UsState } from "./us-states.generated";

/**
 * Sorted BY NAME, not by the order the data carries. `us-states.generated.ts` is ordered by USPS
 * code, where VA precedes VT and DC lands eighth — a list the reader takes as alphabetical has to
 * actually be alphabetical.
 */
const BY_NAME = [...US_STATES].sort((a, b) => a.name.localeCompare(b.name));

/** Every letter that begins a state name. Seven of the twenty-six begin none. */
const LETTERS = [...new Set(BY_NAME.map((s) => s.name.slice(0, 1).toUpperCase()))];

/**
 * The states offered before anyone has chosen anything.
 *
 * WHICH eight is an editorial call and lives here; how many universities each has is not a call at
 * all and comes from Core. Opening on these rather than on all 51 is what keeps the panel the
 * height of the map beside it instead of a page-long scroll nobody asked for.
 */
const POPULAR_CODES = ["CA", "NY", "TX", "MA", "IL", "PA", "WA", "CO"];

/**
 * Cards per page.
 *
 * Sized so the panel's height is set by the pager rather than by which chip is pressed — the map
 * beside it does not move when the filter changes.
 *
 * Eight is also exactly the popular set and exactly the largest letter group (M and N have eight
 * each), so every filter except "All" and a broad search lands on a single page and shows no pager
 * at all. "All" is seven pages of eight, the last holding three.
 */
const PAGE_SIZE = 8;

/** Card geometry, kept beside {@link PAGE_SIZE} so the reserved height below cannot drift from it. */
const CARD_HEIGHT = 72;
const CARD_GAP = 8;

/**
 * How tall a FULL page of cards is — two across, which is the layout everywhere but the narrowest
 * phones.
 *
 * Reserved as a floor FROM `lg` ONLY, and the "only" is the point. There it stops the panel
 * changing height as the filter changes, which matters because the map is beside it and was being
 * resized by every chip press. Below `lg` there is no map to align to and nothing under the panel
 * to push around, so the same reserve bought nothing and cost a screen-and-a-half of empty card on
 * a phone: eight states, then six hundred blank pixels.
 *
 * A floor, not a cap — nothing is clipped if a long name wraps to two lines.
 */
const PAGE_HEIGHT = (() => {
  const rows = Math.ceil(PAGE_SIZE / 2);
  return rows * CARD_HEIGHT + (rows - 1) * CARD_GAP;
})();

export interface StatePanelProps {
  className?: string;
}

/**
 * StatePanel — search, filter, and the state list. The map's other half.
 *
 * <p>Three ways in, one list out: type a name, pick a letter, or take the popular eight. They are
 * mutually exclusive by construction — a single `filter` value plus a search box that supersedes it
 * — so the list can never be showing two things at once, and there is no state where the controls
 * disagree about what is on screen.
 *
 * <p><strong>Never all 51 by default.</strong> That was the old behaviour and it made the page a
 * long vertical scroll of mostly whitespace. "All" is still one tap away and still shows every
 * state; it is simply not what the page opens on.
 *
 * <p>Paged at {@link PAGE_SIZE}, so even "All" is a fixed-height panel rather than a list whose
 * length depends on which chip is pressed — the map beside it does not move when the filter
 * changes. Only "All" and a broad search reach a second page: the page size is exactly the popular
 * set and exactly the largest letter group, so every other filter shows no pager at all.
 */
export function StatePanel({ className }: StatePanelProps) {
  const [filter, setFilter] = useState<string>(POPULAR_FILTER);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const { data: counts, isPending, isError } = useUniversityCounts();
  const listTop = useRef<HTMLDivElement>(null);

  const query = search.trim().toLowerCase();

  const { states, caption } = useMemo(() => {
    // Search supersedes the chips rather than intersecting with them. "Show me states matching
    // 'car' — but only ones starting with M" is a question nobody asked, and an empty result from
    // two filters at once reads as broken rather than as no match.
    if (query) {
      const hits = BY_NAME.filter((s) => s.name.toLowerCase().includes(query));
      return {
        states: hits,
        caption: `${hits.length} ${hits.length === 1 ? "state" : "states"} matching “${search.trim()}”`,
      };
    }
    if (filter === POPULAR_FILTER) {
      const popular = POPULAR_CODES.map((code) => BY_NAME.find((s) => s.code === code)!);
      return { states: popular, caption: "Popular states" };
    }
    if (filter === ALL_FILTER) {
      return { states: BY_NAME, caption: `All ${BY_NAME.length} states` };
    }
    const group = BY_NAME.filter((s) => s.name.slice(0, 1).toUpperCase() === filter);
    return {
      states: group,
      caption: `${group.length} ${group.length === 1 ? "state" : "states"} starting with ${filter}`,
    };
  }, [filter, query, search]);

  const totalPages = Math.ceil(states.length / PAGE_SIZE);
  // Clamped as well as reset on change. The handlers below cover a deliberate change of view; this
  // covers a list that shrinks under one — otherwise the panel shows an empty slice of a list that
  // definitely has rows, which reads as broken rather than as "you are past the end".
  const currentPage = Math.min(page, Math.max(totalPages - 1, 0));
  const shown = states.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  /**
   * Changing what is listed goes back to page one, and does so IN THE HANDLER.
   *
   * Keeping the page across a change means a click on "M" can land on nothing at all — M has one
   * page and you were on the fourth. Written as an effect this is a setState during render's
   * aftermath: React paints the stale page first and the reset second, so the panel flashes a slice
   * of the old list on the way. Resetting where the change actually happens has no such gap, and is
   * why neither of these is a one-liner passed straight to the child.
   */
  const chooseFilter = (next: string) => {
    setFilter(next);
    // Choosing a chip ends the search. Without this the query would still supersede the chip the
    // user just pressed, and the panel would sit there ignoring its own control.
    setSearch("");
    setPage(0);
  };

  const changeSearch = (next: string) => {
    setSearch(next);
    setPage(0);
  };

  return (
    <section
      aria-label="Choose a state"
      /**
       * `min-w-0` is load-bearing, not tidying.
       *
       * This is a GRID ITEM, and a grid item's automatic minimum size is its min-content width —
       * it refuses to shrink below what its contents demand. The filter bar inside is a `nowrap`
       * row of twenty-one chips that are each `shrink-0`, so that min-content is about 1,040px.
       * Its own `overflow-x-auto` lets the ROW scroll, but nothing above it was allowed to be
       * narrower than the row wanted, so the 1,040px propagated up here and pushed the whole page
       * sideways: on a 430px phone the page scrolled horizontally and everything sat off-screen.
       *
       * `min-w-0` is what lets this box be the width of the screen and hands the overflow back to
       * the scroller that was built to absorb it.
       */
      className={cn("card flex min-w-0 flex-col p-4 sm:p-5", className)}
    >
      {/* No visible label: the placeholder, the magnifier and the section heading already say what
          this is, and a "Search states" label above a "Search states…" input is the same sentence
          twice in a panel that is fighting for height. `aria-label` carries the name instead, so
          nothing is lost to a screen reader. */}
      <TextField
        aria-label="Search states"
        type="search"
        placeholder="Search states…"
        value={search}
        onChange={(e) => changeSearch(e.target.value)}
        leadingIcon={<Icon name="search" />}
        /* WebKit draws its own clear control for `type="search"`, unstyled and outside the design
           system — the same reason the header's search shell strips it. Ours replaces it. */
        className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
        trailing={
          search ? (
            <IconButton
              a11yLabel="Clear search"
              variant="soft"
              size="small"
              onClick={() => changeSearch("")}
            >
              <Icon name="close" />
            </IconButton>
          ) : null
        }
      />

      {/**
       * The chips STAY while a search is live — none of them pressed.
       *
       * They used to be hidden, which did keep a pressed chip from contradicting the list, but it
       * removed three rows of controls from the panel: typing made it collapse by about 150px, so
       * the map beside it resized and the page jumped. Emptying the value says the same thing
       * without moving anything — nothing is pressed, because the search is what the list is
       * obeying — and it leaves the chips where they are, which is also the obvious way back out
       * of a search.
       */}
      <StateFilterBar
        className="mt-3"
        letters={LETTERS}
        value={query ? "" : filter}
        onChange={chooseFilter}
      />

      {/* The range matters once there is a pager: "All 51 states" above a list showing eight of
          them is the caption disagreeing with the screen. Without a pager there is no range to
          give, and "1–8 of Popular states" would be noise. */}
      <Caption as="p" color="muted" className="mt-3" role="status" aria-live="polite">
        {totalPages > 1
          ? `${currentPage * PAGE_SIZE + 1}–${currentPage * PAGE_SIZE + shown.length} of ${caption}`
          : caption}
      </Caption>

      {isError ? (
        <Body as="p" size="small" color="muted" className="mt-2" role="alert">
          University counts are unavailable right now. The states are still complete.
        </Body>
      ) : null}

      {/**
       * A reserved minimum at EVERY size — see {@link PAGE_HEIGHT}.
       *
       * It is what stops the panel, and the map stretched beside it, resizing every time a chip is
       * pressed. It was briefly `lg`-only, because an earlier version reserved the ONE-column
       * height (632px) even where the layout was two columns, which left six hundred blank pixels
       * under eight cards on a phone. The reserve is now the two-column height, which is exactly a
       * full page — so a filter with eight states leaves no gap at all, and only the seven letters
       * with a single state reserve anything at all.
       */}
      <div
        ref={listTop}
        // `var(...)` spelled out. The `[--x]` shorthand reads as a variable reference but is a
        // different feature per Tailwind major, and a version bump turning it into
        // `min-height: --page-h` is invalid CSS that fails silently — the panel goes back to
        // jumping with nothing in the diff to explain it.
        className="mt-3 min-h-[var(--page-h)]"
        style={{ "--page-h": `${PAGE_HEIGHT}px` } as React.CSSProperties}
      >
        {states.length === 0 ? (
          <Body as="p" size="small" color="muted" className="py-6 text-center">
            No state matches “{search.trim()}”.
          </Body>
        ) : (
          <ul
            /*
             * Two across everywhere there is room for two, which is everywhere but the narrowest
             * phones. ONE rule on purpose: the previous version stepped back to one column at `lg`
             * and out to two again at `2xl`, which meant the reserved height below had to know
             * which of three column counts was in play, and got it wrong — a mismatch nobody can
             * see in the source, only in the browser.
             */
            className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2"
          >
            {shown.map((state) => (
              <StateRow
                key={state.code}
                state={state}
                count={counts?.byState[state.code]}
                isPending={isPending}
                isError={isError}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Below the list, and only when there is more than one page — a pager under a single page is
          a control that can never do anything. Changing page scrolls the list back to its own top
          rather than the window's: on a desktop the panel scrolls internally, so the window is
          already where it should be and moving it would drag the map out of view. */}
      {/**
       * The pager's SLOT is always here; only the pager itself is conditional.
       *
       * Reserving the list's height was not enough on its own: "All" is the one filter with more
       * than one page, so it alone grew a pager, and the panel — and the map stretched beside it —
       * jumped by the pager's height every time that chip was pressed. A control that appears is
       * still a layout change; the fix is to stop the space appearing with it.
       *
       * Reserved from `lg` only, for the same reason the list's height is: below that there is no
       * map to align to, and an empty 56px strip under the cards would just be blank space on a
       * phone.
       */}
      {/* The base `mt-6`/`min-h-10` are NOT decoration. Without a base the whole slot was
          `lg:`-only, so below that breakpoint the pager had no top margin and no reserved space:
          it sat flush against the last row of cards, reading as overlapping them, and the panel
          still changed height between "All" and every other filter. `lg:mt-8` widens the gap where
          there is room for it. */}
      <div className="mt-6 min-h-10 shrink-0 lg:mt-8">
        {totalPages > 1 ? (
          <Pagination
            className="flex-nowrap"
            page={currentPage}
            totalPages={totalPages}
            /**
             * Sized by arithmetic, not by taste. Beside the map the panel is 320px, so 280px of
             * inner width. The pager's parts are fixed: 40px an arrow, 40px a number, 24px the
             * ellipsis, 40px the last-page label, 6px a gap.
             *
             *   default (5 numbers) → 424px   ✗ ran out past the card's border
             *   3 numbers           → 300px   ✗ wrapped the "›" onto a second line
             *   2 numbers           → 254px   ✓ fits, with 26px to spare
             *
             * `flex-nowrap` rather than `flex-wrap`: wrapping was the previous attempt at safety
             * and it looked broken — a lone next-arrow under the numbers. If a future change makes
             * this too wide again it should be visibly wrong here, not quietly rearranged.

             *
             * The trailing "… 7" stays. Without it "‹ 1 2 ›" tells a reader nothing about whether
             * there are three pages or thirty.
             */
            windowSize={2}
            onPageChange={(next) => {
              setPage(next);
              // `scrollTop`, not `scrollTo({behavior})`: the content is replaced wholesale, so
              // animating a scroll through rows that are already gone shows nothing but a blur. A
              // plain assignment is also the one form every environment implements.
              if (listTop.current) listTop.current.scrollTop = 0;
            }}
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * One state, as a card.
 *
 * <p>Stacked rather than name-left/count-right: at two across, a 200px card cannot hold "District
 * of Columbia" and "148 universities" on one line without one of them truncating, and the name is
 * not the part anyone would accept losing.
 *
 * <p>72px so the two lines breathe, which is also comfortably past the 44px touch floor for when
 * these become links.
 */
function StateRow({
  state,
  count,
  isPending,
  isError,
}: {
  state: UsState;
  count?: number;
  isPending: boolean;
  isError: boolean;
}) {
  return (
    <li
      // Matches the map's convention, and is what identifies a card when the count line is
      // deliberately empty (loading, or the directory unavailable).
      data-state-code={state.code}
      // CARD_HEIGHT in class form. The two have to agree — the reserved page height above is
      // computed from the constant, so a card that is taller than it claims would leave the panel
      // changing height again, which is the whole thing this is here to stop.
      className="flex min-h-[72px] flex-col justify-center gap-0.5 rounded-field border border-border px-3 py-2"
    >
      {/* Wraps rather than truncates. Two across, a card is about 150px, and "District of
          Columbia" would lose its last word — a state name is not a thing to abbreviate silently.
          Two lines plus the count still sit inside the 72px the card reserves. */}
      {/* One step up the library's own scale — `Body` medium (`text-ui`) for the name over `Body`
          small (`text-ui-sm`) for the count, instead of small over a 12px `Caption`. The pair still
          fits inside the 72px the card reserves, so nothing about the panel's height changes. */}
      <Body as="span" size="medium" weight={600} className="leading-tight">
        {state.name}
      </Body>

      {/* Three states, and the third is the point: loading is a placeholder, unavailable is
          BLANK. Neither ever shows a number, because the only numbers worth showing are the ones
          Core actually sent — there is no figure that honestly stands in for "we could not find
          out", and 0 is a lie a visitor cannot detect. */}
      {isError ? null : isPending || count === undefined ? (
        <Skeleton className="h-3.5 w-28" aria-hidden />
      ) : (
        <Body as="span" size="small" color="muted">
          <span className="tabular-nums">{count}</span>{" "}
          {count === 1 ? "university" : "universities"}
        </Body>
      )}
    </li>
  );
}
