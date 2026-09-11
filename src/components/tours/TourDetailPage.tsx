"use client";

import { ArrowLeft, Clock, Globe, MapPin, Star } from "lucide-react";
import { QueryErrorAlert } from "@/components/auth/QueryErrorAlert";
import { Body, Card, Container, Heading, InlineLoading, Link, Tag } from "@/components/ui";
import { useTourDetail } from "@/lib/data-access";
import { formatOfferingPrice } from "@/lib/format";
import { languageLabel, prettifyFeatureCode, topicStyle } from "./tourCard.visuals";

/** Public, anonymous marketplace detail for an ACTIVE discoverable offering. */
export function TourDetailPage({ tourId }: { tourId: string }) {
  const { data: tour, isLoading, isError, error } = useTourDetail(tourId);

  if (isLoading) {
    return (
      <Container className="py-12">
        <InlineLoading label="Loading tour…" />
      </Container>
    );
  }
  if (isError || !tour) {
    return (
      <Container className="py-12">
        <QueryErrorAlert error={error}>This tour is no longer available.</QueryErrorAlert>
      </Container>
    );
  }

  const topic = topicStyle(tour.topic);
  const TopicIcon = topic.icon;

  return (
    <Container className="py-8 pb-20 sm:py-12">
      <Link href="/tours" className="inline-flex items-center gap-2 text-ui-sm font-semibold">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to tours
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card as="article" padded={false} className="overflow-hidden rounded-panel">
          <div className="p-6 sm:p-8">
            <Tag
              color={topic.tagColor}
              variant="inverse"
              leading={<TopicIcon size={14} aria-hidden="true" />}
              className="w-fit"
            >
              {topic.label}
            </Tag>
            <Heading as="h1" size="h1" className="mt-4">
              {tour.title}
            </Heading>
            <Body size="large" weight={600} color="primary-dark" className="mt-3">
              {tour.universityName}
            </Body>
            {tour.universityCity || tour.universityRegion ? (
              <Body color="muted" className="mt-1 inline-flex items-center gap-1.5">
                <MapPin size={16} aria-hidden="true" />
                {[tour.universityCity, tour.universityRegion].filter(Boolean).join(", ")}
              </Body>
            ) : null}

            <Body className="mt-7 whitespace-pre-wrap" color="muted">
              {tour.description ||
                "Your guide will share their campus experience and answer your questions live."}
            </Body>

            {tour.features.length ? (
              <div className="mt-7 flex flex-wrap gap-2">
                {tour.features.map((feature) => (
                  <Tag key={feature} color="gray" variant="secondary">
                    {prettifyFeatureCode(feature)}
                  </Tag>
                ))}
              </div>
            ) : null}
          </div>
        </Card>

        <aside className="space-y-5">
          <Card as="section" className="space-y-5">
            <Heading as="h2" size="h3">
              {formatOfferingPrice(tour.priceCents, tour.currency)}
            </Heading>
            <Body color="muted" className="inline-flex items-center gap-2">
              <Clock size={17} aria-hidden="true" />
              {tour.durationMin} minutes live
            </Body>
            <Body color="muted" className="inline-flex items-center gap-2">
              <Star size={17} aria-hidden="true" className="fill-amber text-amber" />
              {tour.avgRating.toFixed(1)} ({tour.reviewCount} reviews)
            </Body>
            <Body color="muted" className="flex flex-wrap items-center gap-2">
              <Globe size={17} aria-hidden="true" />
              {tour.languages.map(languageLabel).join(", ") || "English"}
            </Body>
            <Body size="small" color="muted" className="rounded-field bg-muted p-3">
              Live-time selection will appear here when booking is enabled.
            </Body>
          </Card>

          <Card as="section">
            <Heading as="h2" size="h4">
              Hosted by {tour.guideDisplayName}
            </Heading>
            <Body color="muted" className="mt-2">
              {tour.guideBio || "A verified current student guide."}
            </Body>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
