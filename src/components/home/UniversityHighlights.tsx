"use client";

import Image from "next/image";
import { Body, Button, Caption, Card, CardMedia, Heading } from "@/components/ui";
import { CAMPUS_FALLBACK_IMAGE } from "@/components/tours/tourCard.visuals";
import { useUniversityDetails, type UniversityDetail } from "@/lib/data-access";
import { cn } from "@/lib/utils";

/**
 * UniversityHighlights — a row of university cards under the quick links: campus image, name,
 * location, how many tours are on offer, and a way in.
 *
 * Which campuses to feature is a fixed choice (the slugs below); everything shown for each one —
 * name, location, tour count and campus photo — comes from Core's university detail read
 * (GET /v1/universities/{slug}), so none of it is a made-up sample. A school that has not loaded
 * (or whose request fails) is simply left out of the row rather than shown with invented figures.
 * The photo holds the card's 16:9 slot and falls back to the shared campus image if a school has
 * none.
 */
export interface UniversityHighlight {
  name: string;
  location: string;
  tourCount: number;
  /** Campus photo URL; falls back to the shared campus image when absent. */
  imageUrl?: string | null;
}

/** The platform universities featured on the home page, by their Core slug. */
const FEATURED_SLUGS = ["berkeley", "duke", "michigan", "gatech"] as const;

/** City + state, tolerating a school Core has no location for. */
function locationOf(u: UniversityDetail): string {
  return [u.city, u.region].filter(Boolean).join(", ");
}

export interface UniversityHighlightsProps {
  className?: string;
  /**
   * The campuses to show. Defaults to the featured slugs above, loaded from Core; passing them in
   * is what lets the singular tour-count case be exercised.
   */
  universities?: UniversityHighlight[];
}

export function UniversityHighlights({
  className,
  universities: universitiesProp,
}: UniversityHighlightsProps) {
  const details = useUniversityDetails(FEATURED_SLUGS);
  const loaded: UniversityHighlight[] = details.flatMap(({ data }) =>
    data
      ? [
          {
            name: data.name,
            location: locationOf(data),
            tourCount: data.tourCount,
            imageUrl: data.imageUrl,
          },
        ]
      : [],
  );
  const universities = universitiesProp ?? loaded;

  if (universities.length === 0) return null;

  return (
    <ul
      className={cn(
        // Same rhythm as the quick links above so the two rows read as one block: single column on
        // a phone, two up once there is room for a readable card, four across from lg.
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {universities.map(({ name, location, tourCount, imageUrl }) => (
        <Card
          as="li"
          key={name}
          padded={false}
          // Flex column + `h-full` keeps the footer row pinned to the bottom, so cards stay level
          // when one name wraps to two lines and its neighbours do not.
          className="flex h-full flex-col overflow-hidden"
        >
          <CardMedia>
            <div className="relative aspect-[16/9] bg-canvas">
              <Image
                src={imageUrl ?? CAMPUS_FALLBACK_IMAGE}
                alt={`${name} campus`}
                fill
                sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
          </CardMedia>

          <div className="flex flex-1 flex-col p-4">
            <Heading as="h3" size="h4">
              {name}
            </Heading>
            <Body as="p" size="small" color="muted" className="mt-1">
              {location}
            </Body>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
              <Caption as="span" color="muted">
                {/* Plural handled inline: one tour reading "1 tours" is the kind of thing that
                    survives to production because nobody seeds a single-tour fixture. */}
                {tourCount} {tourCount === 1 ? "tour" : "tours"}
              </Caption>
              {/* min-h-11 = 44px touch-target floor; `.btn`'s own padding lands just under it. */}
              <Button variant="primary" size="small" className="min-h-11">
                Explore
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </ul>
  );
}
