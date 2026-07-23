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
  /** Pre-formatted currency string, e.g. from {@link formatOfferingPrice} — already includes the symbol. */
  price: string;
}

export function TourCard({ title, university, guide, durationMinutes, price }: TourCardProps) {
  return (
    <Card
      as="article"
      padded={false}
      className="flex h-full flex-col overflow-hidden rounded-[18px]"
    >
      {/* Image placeholder — imported editorial campus crop */}
      <div className="flex h-[150px] items-center justify-center bg-canvas">
        <Icon icon={ImageIcon} size={32} strokeWidth={1.5} className="text-ink-soft/35" />
      </div>
      <div className="flex flex-1 flex-col p-[18px]">
        <StatusBadge variant="success" className="self-start">
          Verified guide
        </StatusBadge>
        <Heading as="h4" size="h4" className="mb-1.5 mt-3.5 min-h-[2.6em]">
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
        <Body as="div" size="small" color="muted" className="mt-1.5 flex items-center gap-1.5">
          <Icon icon={Clock} size={14} className="shrink-0" />
          <span>{durationMinutes} min</span>
        </Body>
        <div className="mt-auto flex items-center justify-between pt-4">
          {/* Off-scale on purpose: the price is the card's most prominent number; 18px has no
              type token and Heading would switch it to the display serif. */}
          <span className="text-[18px] font-extrabold text-ink">{price}</span>
          <Button variant="secondary" size="small" className="flex items-center gap-1.5">
            View tour
            <Icon icon={MoveRight} size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
