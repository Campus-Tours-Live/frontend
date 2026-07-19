"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Container, Link, SectionHeading } from "@/components/ui";
import { TourCard, type TourCardProps } from "@/components/tours/TourCard";

/**
 * FeaturedTours — featured section from design_new (#home .featured).
 *
 * Desktop (lg+): horizontal carousel — fixed-width cards (same size on every
 * screen), side chevron buttons, bottom dot pagination, and blurred/faded edges
 * so the cut-off cards peek through. All 9 cards.
 *
 * Mobile/tablet (< lg, cards stacked vertically): only the first 3 cards are
 * shown, followed by a "View all tours" CTA.
 *
 * Data is hardcoded; "View tour" CTAs are inert for now.
 */
const FEATURED_TOURS: TourCardProps[] = [
  {
    title: "Campus life and hidden study spots",
    university: "North Coast University",
    guide: "Maya Chen",
    durationMinutes: 60,
    price: 42,
  },
  {
    title: "Engineering, labs, and student projects",
    university: "Redwood State College",
    guide: "Elias Brooks",
    durationMinutes: 45,
    price: 36,
  },
  {
    title: "International student experience",
    university: "Harborview University",
    guide: "Sofia Patel",
    durationMinutes: 60,
    price: 44,
  },
  {
    title: "Dorm tour and housing options",
    university: "North Coast University",
    guide: "Liam Walsh",
    durationMinutes: 30,
    price: 28,
  },
  {
    title: "Arts, studios, and performance spaces",
    university: "Lakeside College",
    guide: "Aria Nguyen",
    durationMinutes: 45,
    price: 38,
  },
  {
    title: "Sports, gyms, and student rec",
    university: "Summit University",
    guide: "Marcus Lee",
    durationMinutes: 30,
    price: 30,
  },
  {
    title: "Libraries and quiet study corners",
    university: "Harborview University",
    guide: "Chloe Adams",
    durationMinutes: 45,
    price: 34,
  },
  {
    title: "Dining halls and campus food scene",
    university: "Redwood State College",
    guide: "Diego Romero",
    durationMinutes: 30,
    price: 26,
  },
  {
    title: "Research labs and grad pathways",
    university: "Summit University",
    guide: "Priya Shah",
    durationMinutes: 60,
    price: 48,
  },
];

const COUNT = FEATURED_TOURS.length;

/**
 * Page metrics from the live DOM: one "page" is however many whole cards are
 * currently visible, so paging advances by a full screenful (not one card).
 */
function pageMetrics(el: HTMLDivElement): { stride: number; pageCount: number } {
  const kids = el.children;
  /* istanbul ignore next -- defensive: the carousel always renders all 9 cards */
  if (kids.length < 2) return { stride: el.clientWidth || 1, pageCount: 1 };
  const step = (kids[1] as HTMLElement).offsetLeft - (kids[0] as HTMLElement).offsetLeft;
  if (step <= 0) return { stride: el.clientWidth || 1, pageCount: 1 };
  const perView = Math.max(1, Math.round(el.clientWidth / step));
  return {
    stride: perView * step,
    pageCount: Math.max(1, Math.ceil(COUNT / perView)),
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
  }, [update]);

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
    <Container as="section" width="wide" className="pb-[90px] pt-8">
      <div className="mb-6 flex items-end justify-between gap-5">
        <SectionHeading
          eyebrow="Featured tours"
          title="Start with a campus that feels right."
          level={2}
        />
        {/* Desktop "View all" (mobile gets its own CTA below the stack) */}
        <Link href="/tours" className="hidden shrink-0 font-semibold text-primary lg:inline-block">
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
          {FEATURED_TOURS.map((tour, i) => (
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
        <Link href="/tours" className="font-semibold text-primary">
          View all tours
        </Link>
      </div>
    </Container>
  );
}
