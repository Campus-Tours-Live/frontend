"use client";

import { cn } from "@/lib/utils";
import { Alert, Link, SectionHeading } from "@/components/ui";
import { type TourCardProps } from "@/components/tours/TourCard";
import { TourCarousel } from "@/components/tours/TourCarousel";
import { useTourCatalog, type TourSummary } from "@/lib/data-access";
import { formatOfferingPrice } from "@/lib/format";

/**
 * FeaturedTours — featured section from design_new (#home .featured).
 * Renders the shared {@link TourCarousel} layout over the live tour catalog;
 * see that component for the carousel/mobile-stack behavior.
 *
 * Data comes from GET /v1/tours (public marketplace catalog); "View all" /
 * "View tour" CTAs are inert for now.
 */
function toCardProps(tour: TourSummary): TourCardProps {
  return {
    title: tour.title,
    university: tour.universityName,
    guide: tour.guideDisplayName,
    durationMinutes: tour.durationMin,
    price: formatOfferingPrice(tour.priceCents, tour.currency),
  };
}

export function FeaturedTours() {
  const { data: tours, isLoading, isError } = useTourCatalog();
  const list = tours ?? [];
  const showCarousel = !isLoading && !isError && list.length > 0;

  return (
    <section className="mx-auto max-w-content px-6 pb-[90px] pt-8 xl:max-w-[1280px] 2xl:max-w-[1400px]">
      <div className="mb-6 flex items-end justify-between gap-5">
        <SectionHeading eyebrow="Featured tours" title="Start with a campus that feels right." />
        {/* Desktop "View all" (mobile gets its own CTA below the stack) */}
        {showCarousel ? (
          <Link href="#" className="hidden shrink-0 font-semibold text-primary lg:inline-block">
            View all tours
          </Link>
        ) : null}
      </div>

      {isError ? (
        <Alert variant="error">Couldn&apos;t load featured tours. Please try again later.</Alert>
      ) : isLoading ? (
        <div className="flex gap-5 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-[320px] w-full shrink-0 animate-pulse rounded-card bg-canvas lg:w-[320px]",
                i >= 1 && "hidden lg:block",
              )}
            />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="text-ink-soft">No featured tours yet — check back soon.</p>
      ) : (
        <TourCarousel tours={list.map(toCardProps)} />
      )}
    </section>
  );
}
