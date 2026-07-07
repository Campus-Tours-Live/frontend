import { Link, StatusBadge } from "@/components/ui";
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
    <article className="flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-card">
      {/* Image placeholder — imported editorial campus crop */}
      <div className="flex h-[150px] items-center justify-center bg-canvas text-[12px] font-medium text-ink-soft">
        Imported editorial campus crop
      </div>
      <div className="flex flex-1 flex-col p-[18px]">
        <StatusBadge variant="success" className="self-start">
          Verified guide
        </StatusBadge>
        <h4 className="mb-1.5 mt-3.5 min-h-[2.6em] font-display text-h4 text-ink">{title}</h4>
        <div className="text-[13px] text-ink-soft">
          {university} · {guide} · {durationMinutes} min
        </div>
        <div className="mt-2 text-[13px] font-semibold text-ink-soft">
          {reviewCount > 0 ? `★ ${avgRating.toFixed(1)} (${reviewCount})` : "New tour"}
        </div>
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-[18px] font-extrabold text-ink">
            {formatOfferingPrice(priceCents, currency)}
          </span>
          <Link href={`/tours/${id}`} variant="secondary" size="sm" aria-label={`View ${title}`}>
            View tour
          </Link>
        </div>
      </div>
    </article>
  );
}
