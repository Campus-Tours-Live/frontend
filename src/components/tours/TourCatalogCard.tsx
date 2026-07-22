import { Clock, Star } from "lucide-react";
import { Link, StatusBadge } from "@/components/ui";
import type { TourSummary } from "@/lib/data-access";

function formatPrice(cents: number, currency: string): string {
  const amount = cents / 100;
  const hasCents = cents % 100 !== 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amount);
}

export function TourCatalogCard({ tour, topicLabel }: { tour: TourSummary; topicLabel: string }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-panel border border-border bg-card shadow-card">
      <div className="flex h-[142px] items-center justify-center bg-canvas px-5 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-ink-soft">
        Campus preview
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant="success">Verified guide</StatusBadge>
          <span className="rounded-pill bg-primary-soft px-2.5 py-1 text-[12px] font-bold text-primary-dark">
            {topicLabel}
          </span>
        </div>

        <h3 className="mt-3 font-display text-h4 text-ink">{tour.title}</h3>
        <p className="mt-1 text-[14px] font-semibold text-primary-dark">{tour.universityName}</p>
        <p className="mt-1 text-[13px] text-ink-soft">Hosted by {tour.guideDisplayName}</p>

        <div className="mt-4 flex flex-wrap gap-3 text-[13px] font-semibold text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={15} strokeWidth={2} aria-hidden />
            {tour.durationMin} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star size={15} strokeWidth={2} className="fill-amber text-amber" aria-hidden />
            {tour.avgRating.toFixed(1)} ({tour.reviewCount})
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 pt-5">
          <span className="text-[20px] font-extrabold text-ink">
            {formatPrice(tour.priceCents, tour.currency)}
          </span>
          <Link href={`/tours/${tour.slug}`} variant="secondary" size="small">
            View tour
          </Link>
        </div>
      </div>
    </article>
  );
}
