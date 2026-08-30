"use client";

import { cn } from "@/lib/utils";
import { StatePanel } from "./StatePanel";
import { UsStatesMap } from "./UsStatesMap";

export interface ExploreByStateProps {
  className?: string;
}

/**
 * ExploreByState — the map and the state list as ONE thing.
 *
 * <p>They used to be two headed sections stacked down the page, which split a single task in half:
 * you scrolled past the map to reach the list, and back up to use the map. Side by side they are
 * what they always were — two ways into the same choice.
 *
 * <p><strong>The panel sets the height and the map matches it.</strong> The panel reserves a full
 * page of cards (see StatePanel), so its height is already constant whatever the filter is showing
 * — which makes it the honest thing to measure against. The map card stretches to that height and
 * its SVG, which scales to fit rather than to fill, centres inside whatever box it is given. Two
 * cards ending on the same line is worth the whitespace above and below the map; two cards ending
 * hundreds of pixels apart looked like a mistake.
 *
 * <p><strong>Desktop</strong> gives the map as much as the row can spare — 1.6fr against 0.4fr,
 * with the panel floored at 320px — the width its pager needs, and the point below which
 * two card columns stop being readable. The map is
 * WIDTH-bound in this layout, not height-bound: at a 1.687 aspect ratio it fits the column's width
 * and leaves slack above and below, so every pixel taken off the gap, the card padding or the
 * panel's share goes straight into how big the states are. Neither share is a fixed pixel width, so
 * the pair reflows rather than stepping between layouts.
 *
 * <p><strong>No map at all below `sm`.</strong> A map is a pointing device, and pointing at Rhode
 * Island through a 390px viewport is not something anyone does — the states there are a few pixels
 * across. It was briefly offered behind a "Show map" toggle, which was worse than either answer: it
 * spent a control, and the payoff was a map you still could not use. A phone gets the search field
 * and the list, which are what work at that width.
 */
export function ExploreByState({ className }: ExploreByStateProps) {
  return (
    <div
      className={cn(
        "grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.4fr)] lg:items-stretch lg:gap-4",
        className,
      )}
    >
      {/* Order flipped below `lg`: the search panel is what a phone can actually use, so it comes
          first there and the map follows. On a wide screen the map leads, on the left. */}
      {/* `min-w-0` for the same reason as the panel: a grid item will not shrink below its
          content's min-content width, and an SVG's is its intrinsic size. */}
      <div className="order-2 hidden min-w-0 sm:block lg:order-1">
        <div className="card h-full p-2 sm:p-3 lg:p-3">
          {/**
           * The frame carries the map's own aspect ratio rather than a height in pixels, so the
           * shape is right at every width and nothing is ever squashed. The caps are what stop it
           * dominating: a bounded box simply letterboxes the SVG, which centres itself, instead of
           * the map growing with the viewport until it is the whole first screen.
           */}
          <div className="relative mx-auto aspect-[1370/812] max-h-[52vh] w-full md:max-h-[460px] lg:h-full lg:max-h-none">
            <UsStatesMap className="absolute inset-0 h-full w-full" />
          </div>
        </div>
      </div>

      <StatePanel className="order-1 lg:order-2" />
    </div>
  );
}
