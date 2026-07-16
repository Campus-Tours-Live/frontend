import { Body, Button, Caption, Card, Heading, StatusBadge } from "@/components/ui";

/**
 * TourCard — presentational featured-tour card (design_new .tour-card).
 * Full-height flex column so cards stay equal-sized in the carousel regardless
 * of title length (footer is pinned to the bottom). Inert "View tour" button.
 */
export interface TourCardProps {
  title: string;
  university: string;
  guide: string;
  durationMinutes: number;
  price: number;
}

export function TourCard({ title, university, guide, durationMinutes, price }: TourCardProps) {
  return (
    <Card
      as="article"
      padded={false}
      className="flex h-full flex-col overflow-hidden rounded-[18px]"
    >
      {/* Image placeholder — imported editorial campus crop */}
      <Caption
        as="div"
        weight={500}
        className="flex h-[150px] items-center justify-center bg-canvas"
      >
        Imported editorial campus crop
      </Caption>
      <div className="flex flex-1 flex-col p-[18px]">
        <StatusBadge variant="success" className="self-start">
          Verified guide
        </StatusBadge>
        <Heading as="h4" size="h4" className="mb-1.5 mt-3.5 min-h-[2.6em]">
          {title}
        </Heading>
        <div className="text-ui-sm text-ink-soft">
          {university} · {guide} · {durationMinutes} min
        </div>
        <div className="mt-auto flex items-center justify-between pt-4">
          <Body as="span" size="lead" weight={800}>
            ${price}
          </Body>
          <Button variant="secondary" size="small">
            View tour
          </Button>
        </div>
      </div>
    </Card>
  );
}
