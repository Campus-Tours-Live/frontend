"use client";

import { Body, Button, Caption, Card, CardMedia, Heading } from "@/components/ui";
import { cn } from "@/lib/utils";

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
  universities?: UniversityHighlight[];
}

/** Displays highlighted universities below the quick links. */
export function UniversityHighlights({
  className,
  universities = UNIVERSITIES,
}: UniversityHighlightsProps) {
  return (
    <ul className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {universities.map(({ name, location, tourCount }) => (
        <Card as="li" key={name} padded={false} className="flex h-full flex-col overflow-hidden">
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
                {tourCount} {tourCount === 1 ? "tour" : "tours"}
              </Caption>

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
