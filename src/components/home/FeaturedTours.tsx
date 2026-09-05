"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Container, IconButton, Link, SectionHeading } from "@/components/ui";
import { TourCard, type TourCardProps } from "@/components/tours/TourCard";

/** Featured tours section for the home page. */
const FEATURED_TOURS: TourCardProps[] = [
  { title: "Campus life and hidden study spots", university: "North Coast University", guide: "Maya Chen", durationMinutes: 60, price: 42 },
  { title: "Engineering, labs, and student projects", university: "Redwood State College", guide: "Elias Brooks", durationMinutes: 45, price: 36 },
  { title: "International student experience", university: "Harborview University", guide: "Sofia Patel", durationMinutes: 60, price: 44 },
  { title: "Dorm tour and housing options", university: "North Coast University", guide: "Liam Walsh", durationMinutes: 30, price: 28 },
  { title: "Arts, studios, and performance spaces", university: "Lakeside College", guide: "Aria Nguyen", durationMinutes: 45, price: 38 },
  { title: "Sports, gyms, and student rec", university: "Summit University", guide: "Marcus Lee", durationMinutes: 30, price: 30 },
  { title: "Libraries and quiet study corners", university: "Harborview University", guide: "Chloe Adams", durationMinutes: 45, price: 34 },
  { title: "Dining halls and campus food scene", university: "Redwood State College", guide: "Diego Romero", durationMinutes: 30, price: 26 },
  { title: "Research labs and grad pathways", university: "Summit University", guide: "Priya Shah", durationMinutes: 60, price: 48 },
];

const TOUR_COUNT = FEATURED_TOURS.length;

function getPageMetrics(el: HTMLDivElement): { stride: number; pageCount: number } {
  const children = el.children;

  /* istanbul ignore next -- the carousel always renders all featured tours */
  if (children.length < 2) return { stride: el.clientWidth || 1, pageCount: 1 };

  const step = (children[1] as HTMLElement).offsetLeft - (children[0] as HTMLElement).offsetLeft;
  if (step <= 0) return { stride: el.clientWidth || 1, pageCount: 1 };

  const perView = Math.max(1, Math.round(el.clientWidth / step));
  return {
    stride: perView * step,
    pageCount: Math.max(1, Math.ceil(TOUR_COUNT / perView)),
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
    /* istanbul ignore next -- ref is attached after mount */
    if (!el) return;

    const { stride, pageCount } = getPageMetrics(el);
    setPageCount(pageCount);
    setActive(Math.min(pageCount - 1, Math.max(0, Math.round(el.scrollLeft / stride))));
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  const goToPage = (page: number) => {
    const el = scrollerRef.current;
    /* istanbul ignore next -- ref is attached after mount */
    if (!el) return;

    const { stride, pageCount } = getPageMetrics(el);
    /* istanbul ignore next -- controls pass valid page values */
    const targetPage = Math.min(pageCount - 1, Math.max(0, page));
    el.scrollTo({ left: targetPage * stride, behavior: "smooth" });
  };

  return (
    <Container as="section" width="wide" className="pb-[90px] pt-8">
      <SectionHeading
        eyebrow="Featured tours"
        title="Start with a campus that feels right."
        level={2}
        className="mb-6"
        action={
          <Link href="/tours" className="hidden shrink-0 font-semibold text-primary lg:inline-block">
            View all tours
          </Link>
        }
      />

      <div className="relative">
        <div
          ref={scrollerRef}
          onScroll={update}
          className="flex flex-col gap-5 lg:flex-row lg:overflow-x-auto lg:scroll-smooth lg:pb-3 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
        >
          {FEATURED_TOURS.map((tour, index) => (
            <div
              key={tour.title}
              className={cn("w-full lg:w-[320px] lg:shrink-0", index >= 3 && "hidden lg:block")}
            >
              <TourCard {...tour} />
            </div>
          ))}
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-14 bg-gradient-to-r from-background/40 to-transparent backdrop-blur-[2px] [mask-image:linear-gradient(to_right,black,transparent)] lg:block" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-14 bg-gradient-to-l from-background/40 to-transparent backdrop-blur-[2px] [mask-image:linear-gradient(to_left,black,transparent)] lg:block" />

        <IconButton
          a11yLabel="Previous tours"
          variant="card"
          onClick={() => goToPage(active - 1)}
          disabled={active === 0}
          className="absolute left-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 lg:inline-flex"
        >
          <Chevron dir="left" />
        </IconButton>

        <IconButton
          a11yLabel="Next tours"
          variant="card"
          onClick={() => goToPage(active + 1)}
          disabled={active === pageCount - 1}
          className="absolute right-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 lg:inline-flex"
        >
          <Chevron dir="right" />
        </IconButton>
      </div>

      <div className="mt-5 hidden justify-center gap-2 lg:flex">
        {Array.from({ length: pageCount }).map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to page ${index + 1}`}
            aria-current={index === active}
            onClick={() => goToPage(index)}
            className={cn(
              "h-2 rounded-pill transition-all",
              index === active ? "w-5 bg-primary" : "w-2 bg-border hover:bg-ink-soft",
            )}
          />
        ))}
      </div>

      <div className="mt-6 flex justify-center lg:hidden">
        <Link href="/tours" className="font-semibold text-primary">
          View all tours
        </Link>
      </div>
    </Container>
  );
}
