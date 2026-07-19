"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon, IconButton, Link } from "@/components/ui";
import { TourCard, type TourCardProps } from "./TourCard";

/**
 * TourCarousel — the shared tour-list layout (extracted from FeaturedTours so
 * any page can show the same "browse tours" interaction over a different list).
 *
 * Desktop (lg+): horizontal carousel — fixed-width cards, side chevron buttons,
 * bottom dot pagination, and blurred/faded edges so cut-off cards peek through.
 *
 * Mobile/tablet (< lg, cards stacked vertically): only the first 3 cards are
 * shown, followed by a "View all tours" CTA. `viewAllHref` is inert ("#") by
 * default until a real tour-catalog route exists.
 */
export interface TourCarouselProps {
  tours: TourCardProps[];
  viewAllHref?: string;
}

/**
 * Each page's target `scrollLeft`, from the live DOM: one "page" is however many
 * whole cards are currently visible, so paging advances by a full screenful (not
 * one card). The last target is clamped to the real max scroll — when `count`
 * isn't a multiple of cards-per-view, the final page has fewer cards left over
 * than a full screenful, so a naive `pageIndex * stride` would overshoot past
 * where the browser can actually scroll. That mismatch, left unclamped, made the
 * "active page" (computed by dividing scrollLeft back by stride) round down to
 * an earlier page even once you'd hit the end — so the last page's dot never lit
 * up and "next" never disabled.
 */
function pageTargets(el: HTMLDivElement, count: number): number[] {
  const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
  const kids = el.children;
  if (kids.length < 2) return [0];
  const step = (kids[1] as HTMLElement).offsetLeft - (kids[0] as HTMLElement).offsetLeft;
  if (step <= 0) return [0];
  const perView = Math.max(1, Math.round(el.clientWidth / step));
  const pageCount = Math.max(1, Math.ceil(count / perView));
  return Array.from({ length: pageCount }, (_, page) =>
    Math.min(page * perView * step, maxScrollLeft),
  );
}

/** Index of the target closest to `scrollLeft` — how a raw scroll position maps back to a page. */
function nearestPage(scrollLeft: number, targets: number[]): number {
  let best = 0;
  let bestDistance = Infinity;
  targets.forEach((target, i) => {
    const distance = Math.abs(scrollLeft - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  });
  return best;
}

export function TourCarousel({ tours, viewAllHref = "#" }: TourCarouselProps) {
  const count = tours.length;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    /* istanbul ignore next -- ref is always attached once mounted */
    if (!el) return;
    const targets = pageTargets(el, count);
    setPageCount(targets.length);
    setActive(nearestPage(el.scrollLeft, targets));
  }, [count]);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  // Jump a whole page at a time, with a smooth scroll transition. `active`/`pageCount`
  // are set here immediately (not left to `onScroll` alone) so the chevrons flip to
  // their new enabled/disabled state right away — otherwise, for the ~300ms the smooth
  // scroll takes to settle, the opposite chevron still reads its pre-click state and a
  // quick second click (e.g. "next" then "prev" right away) lands on a disabled button
  // and is silently swallowed.
  const goToPage = (page: number) => {
    const el = scrollerRef.current;
    /* istanbul ignore next -- ref is always attached once mounted */
    if (!el) return;
    const targets = pageTargets(el, count);
    /* istanbul ignore next -- callers (chevrons/dots) only pass in-range pages */
    const i = Math.min(targets.length - 1, Math.max(0, page));
    setPageCount(targets.length);
    setActive(i);
    el.scrollTo({ left: targets[i], behavior: "smooth" });
  };

  return (
    <>
      <div className="relative">
        {/* < lg: vertical stack. lg+: horizontal carousel. */}
        <div
          ref={scrollerRef}
          onScroll={update}
          className="flex flex-col gap-5 lg:flex-row lg:overflow-x-auto lg:scroll-smooth lg:pb-3 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
        >
          {tours.map((tour, i) => (
            <div
              key={tour.title}
              className={cn(
                "w-full lg:w-[320px] lg:shrink-0",
                // mobile vertical view shows only the first 3
                i >= 3 && "hidden lg:block",
              )}
            >
              <TourCard {...tour} />
            </div>
          ))}
        </div>

        {/* Blurred peek edges (desktop carousel only) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-14 bg-gradient-to-r from-background/40 to-transparent backdrop-blur-[2px] [mask-image:linear-gradient(to_right,black,transparent)] lg:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-14 bg-gradient-to-l from-background/40 to-transparent backdrop-blur-[2px] [mask-image:linear-gradient(to_left,black,transparent)] lg:block"
        />

        {/* Side chevrons (desktop carousel only) */}
        <IconButton
          a11yLabel="Previous tours"
          variant="soft"
          onClick={() => goToPage(active - 1)}
          disabled={active === 0}
          className="absolute left-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 border border-border bg-card text-ink shadow-card transition hover:border-primary hover:bg-card hover:text-primary lg:grid"
        >
          <Icon name="chevronLeft" size={20} strokeWidth={2.2} />
        </IconButton>
        <IconButton
          a11yLabel="Next tours"
          variant="soft"
          onClick={() => goToPage(active + 1)}
          disabled={active === pageCount - 1}
          className="absolute right-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 border border-border bg-card text-ink shadow-card transition hover:border-primary hover:bg-card hover:text-primary lg:grid"
        >
          <Icon name="chevronRight" size={20} strokeWidth={2.2} />
        </IconButton>
      </div>

      {/* Page-based dot pagination (desktop carousel only) */}
      <div className="mt-5 hidden justify-center gap-2 lg:flex">
        {Array.from({ length: pageCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to page ${i + 1}`}
            aria-current={i === active}
            onClick={() => goToPage(i)}
            className={cn(
              "h-2 rounded-pill transition-all",
              i === active ? "w-5 bg-primary" : "w-2 bg-border hover:bg-ink-soft",
            )}
          />
        ))}
      </div>

      {/* Mobile "View all" CTA (vertical stack only) */}
      <div className="mt-6 flex justify-center lg:hidden">
        <Link href={viewAllHref} className="font-semibold text-primary">
          View all tours
        </Link>
      </div>
    </>
  );
}
