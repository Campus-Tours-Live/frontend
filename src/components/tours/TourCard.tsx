import { Clock, GraduationCap, ImageIcon, MoveRight } from "lucide-react";
import { Button, Icon, StatusBadge } from "@/components/ui";

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
    <article className="card group flex h-full flex-col overflow-hidden transition-all duration-200 hover:-translate-y-[3px] hover:border-sage hover:shadow-[0_14px_34px_rgba(47,52,55,0.09)]">
      {/* Image placeholder — imported editorial campus crop */}
      <div className="relative flex h-[150px] shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-sage-soft to-canvas">
        <Icon icon={ImageIcon} size={28} strokeWidth={1.5} className="text-ink-soft/35" />
        <StatusBadge variant="success" className="absolute left-3 top-3 shadow-sm">
          Verified guide
        </StatusBadge>
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-pill bg-card px-2.5 py-1 text-[12px] font-semibold text-ink shadow-sm">
          <Icon icon={Clock} size={12} strokeWidth={2} />
          {durationMinutes} min
        </span>
      </div>

      <div className="card-pad flex flex-1 flex-col">
        <h4 className="mb-1.5 line-clamp-2 min-h-[2.6em] font-display text-h4 text-ink">{title}</h4>
        <div className="flex items-center gap-1.5 text-[13px] text-ink-soft">
          <Icon icon={GraduationCap} size={14} className="text-sage-deep" />
          <span className="truncate">
            {university} · {guide}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-[18px] font-extrabold text-ink">${price}</span>
          <Button variant="secondary" size="sm" className="gap-1.5">
            View tour
            <Icon
              icon={MoveRight}
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Button>
        </div>
      </div>
    </article>
  );
}
