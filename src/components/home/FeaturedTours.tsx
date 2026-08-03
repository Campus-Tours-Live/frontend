"use client";

import { cn } from "@/lib/utils";
import { Alert, Container, Link, SectionHeading } from "@/components/ui";
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
  const list = tours?.items ?? [];

  return (
    <Container as="section" width="wide" className="pb-[90px] pt-8">
      <SectionHeading
        eyebrow="Featured tours"
        title="Start with a campus that feels right."
        level={2}
        className="mb-6"
        // Desktop "View all" (mobile gets its own CTA below the stack)
        action={
          <Link
            href="/tours"
            className="hidden shrink-0 font-semibold text-primary lg:inline-block"
          >
            View all tours
          </Link>
        }
      />

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
        <TourCarousel tours={list.map(toCardProps)} viewAllHref="/tours" />
      )}
    </Container>
  );
}
