"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Globe, Heart, Star } from "lucide-react";
import { Body, Heading, IconButton, Tag } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { TourSummary } from "@/lib/data-access";
import {
  CAMPUS_FALLBACK_IMAGE,
  languageLabel,
  majorGlyph,
  prettifyFeatureCode,
  topicStyle,
} from "./tourCard.visuals";

export interface TourProductCardProps {
  tour: TourSummary;
  /** Guide's field of study, if known (not yet on TourSummary). */
  major?: string;
  /** Guide's degree level, e.g. "BS" | "MS" | "PhD" (not yet on TourSummary). */
  degree?: string;
  /** Year the guide entered the university, e.g. 2023 (not yet on TourSummary). */
  entryYear?: number;
  /** Feature code→label map (from `useTourFeatures`); falls back to a prettified code if absent. */
  featureLabels?: Record<string, string>;
  saved?: boolean;
  onToggleSave?: (tourId: string) => void;
  className?: string;
}

function formatPrice(cents: number, currency: string): string {
  const hasCents = cents % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(cents / 100);
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[words.length - 1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * TourProductCard — the public marketplace card, following the mainstream "experience led by a
 * person" pattern (Airbnb / Udemy / Preply): a clean campus photo (save-heart only), then a content
 * column with campus → title → guide (avatar + name + one credentials line) → a single topic chip →
 * rating / duration / price. Topic is shown once (chip) and reinforced by the duotone card behind +
 * the avatar tint; campus is the photo + name. The whole card links to the tour (stretched link);
 * the save heart stays independently clickable.
 */
export function TourProductCard({
  tour,
  major,
  degree,
  entryYear,
  featureLabels,
  saved = false,
  onToggleSave,
  className,
}: TourProductCardProps) {
  const t = topicStyle(tour.topic);
  const TopicIcon = t.icon;

  // Guide credentials condensed to one line: "BS Computer Science · Entered 2023" (fields optional).
  const majorLabel = major ? majorGlyph(major).label : undefined;
  const MajorIcon = major ? majorGlyph(major).icon : null;
  const degreeMajor = [degree, majorLabel].filter(Boolean).join(" ");
  const entry = entryYear ? `Entered ${entryYear}` : undefined;
  const credentials = [degreeMajor || undefined, entry].filter(Boolean).join(" · ");

  // The backend resolves the campus photo (R2); a missing/failed load falls back to the shared image.
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = imageFailed
    ? CAMPUS_FALLBACK_IMAGE
    : (tour.universityImageUrl ?? CAMPUS_FALLBACK_IMAGE);

  return (
    <article className={cn("relative flex h-full flex-col", className)}>
      {/* An equal-size card stacked BEHIND — the campus photo tinted with the topic colour (duotone),
          offset up-left so it peeks along the top + left edges, as if the front card slid down-right
          off it. Photo = campus · colour = topic. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 isolate -translate-x-2 -translate-y-2 overflow-hidden rounded-panel border border-border shadow-card"
      >
        {/* No conditional: `imageSrc` always resolves (CAMPUS_FALLBACK_IMAGE backs both the
            missing-URL and failed-load cases), so the old gradient branch was unreachable. */}
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="(max-width:600px) 100vw, (max-width:980px) 50vw, 360px"
          className="object-cover grayscale"
        />
        <div className={cn("absolute inset-0 opacity-60 mix-blend-multiply", t.dot)} />
      </div>

      {/* Card surface — the front card, at natural position (slid down-right off the card behind). */}
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-panel border border-border bg-card shadow-card">
        {/* ---------- media: campus photo — clean, save-heart only ---------- */}
        <div className="relative aspect-square">
          <Image
            src={imageSrc}
            alt={`${tour.universityName} campus`}
            fill
            sizes="(max-width:600px) 100vw, (max-width:980px) 50vw, 360px"
            className="object-cover"
            onError={() => setImageFailed(true)}
          />
          {tour.isNew ? (
            <Tag
              color="coral"
              variant="inverse"
              className="absolute left-3 top-3 z-10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] shadow-sm"
            >
              New
            </Tag>
          ) : null}
          <IconButton
            variant="glass"
            size="small"
            a11yLabel={saved ? "Remove from saved" : "Save tour"}
            aria-pressed={saved}
            onClick={() => onToggleSave?.(tour.id)}
            className="absolute right-3 top-3 z-10"
          >
            <Heart size={16} strokeWidth={2} className={cn(saved && "fill-current")} />
          </IconButton>
        </div>

        {/* ---------- body ---------- */}
        <div className="flex min-h-[14rem] flex-1 flex-col gap-2 p-4">
          {/* Kicker (campus) + title read as one unit — kept tight, title leads the hierarchy. */}
          <div>
            <Body as="span" size="medium" weight={700} color="inherit" className="block text-teal">
              {tour.universityName}
            </Body>
            <Heading as="h3" size="large" className="mt-0.5 min-h-[2.4em] leading-tight">
              <Link
                href={`/tours/${tour.slug}`}
                className="no-underline after:absolute after:inset-0 hover:no-underline focus-visible:outline-none"
              >
                {tour.title}
              </Link>
            </Heading>
          </div>

          {/* Guide — avatar placeholder (initials until real photos) + full name + credentials line. */}
          <div className="mt-1 flex items-center gap-3">
            <span
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-pill font-display text-[14px] font-bold text-ivory",
                t.dot,
              )}
              aria-hidden
            >
              {initials(tour.guideDisplayName)}
            </span>
            <span className="min-w-0 leading-tight">
              <Body as="span" size="large" weight={700} color="ink" className="block truncate">
                {tour.guideDisplayName}
              </Body>
              {credentials ? (
                <Body
                  as="span"
                  size="small"
                  color="muted"
                  className="mt-0.5 flex items-center gap-1 truncate"
                >
                  {MajorIcon ? (
                    <MajorIcon size={13} strokeWidth={2} aria-hidden className="shrink-0" />
                  ) : null}
                  <span className="truncate">{credentials}</span>
                </Body>
              ) : null}
            </span>
          </div>

          {/* Topic — shown once, as a single scannable chip (deep topic colour, light text). */}
          <Tag
            color={t.tagColor}
            variant="inverse"
            leading={<TopicIcon size={14} strokeWidth={2} aria-hidden />}
            className="w-fit gap-1.5 px-3 py-1.5 text-[12.5px] font-bold"
          >
            {t.label}
          </Tag>

          {/* Languages — their own row (all shown; the globe leads the group). */}
          {tour.languages.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {tour.languages.map((lang, i) => (
                <Tag
                  key={lang}
                  color="gray"
                  variant="secondary"
                  leading={<Globe size={13} strokeWidth={2} aria-hidden />}
                >
                  {languageLabel(lang)}
                </Tag>
              ))}
            </div>
          ) : null}

          {/* Feature chips — their own row below languages (≤3), lighter than the topic chip. */}
          {tour.features.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {tour.features.slice(0, 3).map((code) => (
                <Tag key={code} color="gray" variant="secondary">
                  {featureLabels?.[code] ?? prettifyFeatureCode(code)}
                </Tag>
              ))}
            </div>
          ) : null}

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
            <Body
              as="span"
              size="small"
              weight={700}
              color="ink"
              className="inline-flex items-center gap-1"
            >
              <Star size={14} strokeWidth={2} className="fill-amber text-amber" aria-hidden />
              {tour.avgRating.toFixed(tour.avgRating % 1 === 0 ? 0 : 1)}
              <Body as="span" size="small" weight={600} color="muted">
                ({tour.reviewCount})
              </Body>
            </Body>
            <Body
              as="span"
              size="small"
              weight={600}
              color="muted"
              className="inline-flex items-center gap-1"
            >
              <Clock size={14} strokeWidth={2} aria-hidden />
              {tour.durationMin} min
            </Body>
            <Heading as="span" size="large" color="ink">
              {formatPrice(tour.priceCents, tour.currency)}
            </Heading>
          </div>
        </div>
      </div>
    </article>
  );
}
