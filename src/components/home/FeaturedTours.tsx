"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Heading, Link, Spinner } from "@/components/ui";
import { TourCard } from "@/components/tours/TourCard";
import { ApiError, useTourCatalog } from "@/lib/data-access";
import { cn } from "@/lib/utils";

/**
 * FeaturedTours — featured section from design_new (#home .featured).
 *
 * Desktop (lg+): horizontal carousel — fixed-width cards (same size on every
 * screen), side chevron buttons, bottom dot pagination, and blurred/faded edges.
 *
 * Mobile/tablet (< lg, cards stacked vertically): only the first 3 cards are
 * shown, followed by a "View all tours" CTA.
 *
 * Data comes from the BFF public marketplace contract (GET /v1/tours).
 */

/**
 * Page metrics from the live DOM: one "page" is however many whole cards are
 * currently visible, so paging advances by a full screenful (not one card).
 */
function pageMetrics(el: HTMLDivElement): { stride: number; pageCount: number } {
  const kids = el.children;
  /* istanbul ignore next -- defensive: fewer than two cards need no paging */
  if (kids.length < 2) return { stride: el.clientWidth || 1, pageCount: 1 };
  const step = (kids[1] as HTMLElement).offsetLeft - (kids[0] as HTMLElement).offsetLeft;
  if (step <= 0) return { stride: el.clientWidth || 1, pageCount: 1 };
  const perView = Math.max(1, Math.round(el.clientWidth / step));
  return {
    stride: perView * step,
    pageCount: Math.max(1, Math.ceil(kids.length / perView)),
  };
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

export function FeaturedTours() {
  const {
    data: tours = [],
    isLoading,
    error,
  } = useTourCatalog({
    sort: "RECOMMENDED",
    limit: 20,
  });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    /* istanbul ignore next -- ref is always attached once mounted */
    if (!el) return;
    const { stride, pageCount } = pageMetrics(el);
    setPageCount(pageCount);
    setActive(Math.min(pageCount - 1, Math.max(0, Math.round(el.scrollLeft / stride))));
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update, tours.length]);

  // Jump a whole page at a time, with a smooth scroll transition.
  const goToPage = (page: number) => {
    const el = scrollerRef.current;
    /* istanbul ignore next -- ref is always attached once mounted */
    if (!el) return;
    const { stride, pageCount } = pageMetrics(el);
    /* istanbul ignore next -- callers (chevrons/dots) only pass in-range pages */
    const i = Math.min(pageCount - 1, Math.max(0, page));
    el.scrollTo({ left: i * stride, behavior: "smooth" });
  };

  return (
    <section className="mx-auto max-w-content px-6 pb-[90px] pt-8 xl:max-w-[1280px] 2xl:max-w-[1400px]">
      <div className="mb-6 flex items-end justify-between gap-5">
        <div>
          <div className="eyebrow">Featured tours</div>
          <Heading as="h2" size="h2" className="mt-1">
            Start with a campus that feels right.
          </Heading>
        </div>
        {/* Desktop "View all" (mobile gets its own CTA below the stack) */}
        <Link href="#" className="hidden shrink-0 font-semibold text-primary lg:inline-block">
          View all tours
        </Link>
      </div>

      <div className="relative">
        {/* < lg: vertical stack. lg+: horizontal carousel. */}
        <div
          ref={scrollerRef}
          onScroll={update}
          className="flex flex-col gap-5 lg:flex-row lg:overflow-x-auto lg:scroll-smooth lg:pb-3 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
        >
          {tours.map((tour, i) => (
            <div
              key={tour.id}
              className={cn(
                "w-full lg:w-[320px] lg:shrink-0",
                // mobile vertical view shows only the first 3
                i >= 3 && "hidden lg:block",
              )}
            >
              <TourCard
                id={tour.id}
                title={tour.title}
                university={tour.universityName}
                guide={tour.guideDisplayName}
                durationMinutes={tour.durationMin}
                priceCents={tour.priceCents}
                currency={tour.currency}
                avgRating={tour.avgRating}
                reviewCount={tour.reviewCount}
              />
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-ink-soft">
            <Spinner /> Loading tours…
          </div>
        ) : null}

        {error ? (
          <Alert variant="info" className="my-6">
            {error instanceof ApiError && error.status === 401 ? (
              <>
                <Link href="/signin" className="font-bold">
                  Sign in
                </Link>{" "}
                to browse the live tour catalog.
              </>
            ) : (
              "Tours could not be loaded right now. Please try again later."
            )}
          </Alert>
        ) : null}

        {!isLoading && !error && tours.length === 0 ? (
          <Alert variant="info" className="my-6">
            No live tours are available yet.
          </Alert>
        ) : null}

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
        <button
          type="button"
          aria-label="Previous tours"
          onClick={() => goToPage(active - 1)}
          disabled={active === 0}
          className="absolute left-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-pill border border-border bg-card text-ink shadow-card transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 lg:grid"
        >
          <Chevron dir="left" />
        </button>
        <button
          type="button"
          aria-label="Next tours"
          onClick={() => goToPage(active + 1)}
          disabled={active === pageCount - 1}
          className="absolute right-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-pill border border-border bg-card text-ink shadow-card transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 lg:grid"
        >
          <Chevron dir="right" />
        </button>
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
        <Link href="#" className="font-semibold text-primary">
          View all tours
        </Link>
      </div>
    </section>
  );
}
