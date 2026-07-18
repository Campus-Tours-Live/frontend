import { Caption, Card, Heading, Link, StatusBadge } from "@/components/ui";
import { formatOfferingPrice } from "@/lib/format";

/**
 * TourCard — presentational featured-tour card (design_new .tour-card).
 * Full-height flex column so cards stay equal-sized in the carousel regardless
 * of title length (footer is pinned to the bottom).
 */
export interface TourCardProps {
  id: string;
  title: string;
  university: string;
  guide: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  avgRating: number;
  reviewCount: number;
}

export function TourCard({
  id,
  title,
  university,
  guide,
  durationMinutes,
  priceCents,
  currency,
  avgRating,
  reviewCount,
}: TourCardProps) {
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
        <Caption as="div">
          {university} · {guide} · {durationMinutes} min
        </Caption>
        <Caption as="div" weight={600} className="mt-2">
          {reviewCount > 0 ? `★ ${avgRating.toFixed(1)} (${reviewCount})` : "New tour"}
        </Caption>
        <div className="mt-auto flex items-center justify-between gap-4 pt-4">
          {/* Off-scale on purpose: the price is the card's most prominent number; 18px has no
              type token and Heading would switch it to the display serif. */}
          <span className="text-[18px] font-extrabold text-ink">
            {formatOfferingPrice(priceCents, currency)}
          </span>
          <Link href={`/tours/${id}`} variant="secondary" size="small" aria-label={`View ${title}`}>
            View tour
          </Link>
        </div>
      </div>
    </Card>
  );
}
