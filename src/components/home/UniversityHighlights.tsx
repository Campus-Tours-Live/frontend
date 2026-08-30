"use client";

import { Body, Button, Caption, Card, CardMedia, Heading } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * UniversityHighlights — a row of university cards under the quick links: campus image, name,
 * location, how many tours are on offer, and a way in.
 *
 * Presentational only, with hardcoded content, matching how `FeaturedTours` seeds the home page
 * today. The media is a labelled placeholder rather than an image: there is no per-university
 * asset in the bucket yet, and inventing one by reusing the banner illustration four times would
 * read as a bug. It holds the card's 16:9 slot so the layout is already correct when real crops
 * arrive — same approach `TourCard` takes.
 */
export interface UniversityHighlight {
  name: string;
  location: string;
  tourCount: number;
}

const UNIVERSITIES: UniversityHighlight[] = [
  { name: "North Coast University", location: "Coastal City, CA", tourCount: 32 },
  { name: "Redwood State College", location: "Chico, CA", tourCount: 8 },
  { name: "Harborview University", location: "Seattle, WA", tourCount: 5 },
  { name: "Blue Ridge Institute", location: "Morrison, CO", tourCount: 3 },
];

export interface UniversityHighlightsProps {
  className?: string;
  /**
   * The campuses to show. Defaults to the hardcoded sample above; taking them as a prop is what
   * lets the singular tour-count case be exercised, and is the seam real data will arrive through.
   */
  universities?: UniversityHighlight[];
}

export function UniversityHighlights({
  className,
  universities = UNIVERSITIES,
}: UniversityHighlightsProps) {
  return (
    <ul
      className={cn(
        // Same rhythm as the quick links above so the two rows read as one block: single column on
        // a phone, two up once there is room for a readable card, four across from lg.
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {universities.map(({ name, location, tourCount }) => (
        <Card
          as="li"
          key={name}
          padded={false}
          // Flex column + `h-full` keeps the footer row pinned to the bottom, so cards stay level
          // when one name wraps to two lines and its neighbours do not.
          className="flex h-full flex-col overflow-hidden"
        >
          <CardMedia>
            <Caption
              as="div"
              weight={500}
              color="muted"
              className="flex aspect-[16/9] items-center justify-center bg-canvas"
            >
              Campus photo
            </Caption>
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
