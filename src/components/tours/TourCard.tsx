"use client";

import { Clock, GraduationCap, ImageIcon, MoveRight } from "lucide-react";
import { Body, Button, Card, Heading, Icon, LineClamp, Link, StatusBadge } from "@/components/ui";

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
  /** Locale/currency-formatted price (see formatOfferingPrice), e.g. "$42.00". */
  price: string;
}

export function TourCard({ title, university, guide, durationMinutes, price }: TourCardProps) {
  return (
    <Card
      as="article"
      padded={false}
      className="group flex h-full flex-col overflow-hidden transition-all duration-200 hover:-translate-y-[3px] hover:border-sage hover:shadow-[0_14px_34px_rgba(47,52,55,0.09)]"
    >
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
        <Heading as="h4" size="h4" className="mb-1.5 min-h-[2.6em]">
          <LineClamp lines={2}>{title}</LineClamp>
        </Heading>
        <Body as="div" size="small" color="muted" className="flex items-center gap-1.5">
          <Link
            href="/university"
            onClick={(e) => e.stopPropagation()}
            className="flex min-w-0 flex-1 items-center gap-1.5 hover:text-primary hover:underline"
          >
            <Icon icon={GraduationCap} size={14} className="shrink-0 text-sage-deep" />
            <span className="min-w-0 flex-1 truncate">{university}</span>
          </Link>
          <span className="shrink-0">· {guide}</span>
        </Body>

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-[18px] font-extrabold text-ink">{price}</span>
          <Button variant="secondary" size="small" className="gap-1.5">
            View tour
            <Icon
              icon={MoveRight}
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Button>
        </div>
      </div>
    </Card>
  );
}
