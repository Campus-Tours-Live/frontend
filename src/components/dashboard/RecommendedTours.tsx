"use client";

import { Link, SectionHeading, Skeleton } from "@/components/ui";
import { useTourCatalog } from "@/lib/data-access";
import { TourCard } from "@/components/tours/TourCard";

/**
 * Recommended tours strip for the participant dashboard — fetches the top 4 tours
 * and renders them in a 2-column grid. Hidden when loading fails or the catalog
 * is empty. "See all tours" links to the public /tours explore page.
 */
export function RecommendedTours() {
  const { data, isLoading, isError } = useTourCatalog({ limit: 4, sort: "RECOMMENDED" });
  const tours = data?.items ?? [];

  if (!isLoading && (isError || tours.length === 0)) return null;

  return (
    <section aria-labelledby="recommended-heading">
      <SectionHeading
        eyebrow="Recommended"
        title="Keep exploring"
        titleId="recommended-heading"
        level={2}
        className="mb-6"
        action={
          <Link href="/tours" className="shrink-0 font-semibold text-primary">
            See all tours
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-[18px]">
                <Skeleton height={150} className="rounded-none" />
                <div className="flex flex-col gap-3 p-[18px]">
                  <Skeleton height={14} width="35%" />
                  <Skeleton height={40} />
                  <Skeleton height={14} width="65%" />
                  <div className="mt-2 flex items-center justify-between">
                    <Skeleton height={24} width={56} />
                    <Skeleton height={32} width={88} variant="rounded" />
                  </div>
                </div>
              </div>
            ))
          : tours.map((tour) => (
              <TourCard
                key={tour.id}
                title={tour.title}
                university={tour.universityName}
                guide={tour.guideDisplayName}
                durationMinutes={tour.durationMin}
                price={Math.round(tour.priceCents / 100)}
              />
            ))}
      </div>
    </section>
  );
}
