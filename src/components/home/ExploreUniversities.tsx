"use client";

import Image from "next/image";
import { Card, Container, Icon, Link, SectionHeading } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { UniversityHighlights } from "./UniversityHighlights";
import { UniversityQuickLinks } from "./UniversityQuickLinks";

/** University discovery section shown below FeaturedTours on the home page. */
export function ExploreUniversities() {
  return (
    <Container as="section" width="wide" className="pb-[90px]" aria-labelledby="explore-unis">
      <Card padded={false} className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 select-none">
          <Image
            src={assetUrl("hero_explore_universities.png")}
            alt=""
            fill
            sizes="(min-width: 1280px) 1400px, 100vw"
            className="object-cover object-right"
          />
        </div>

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-card from-45% to-transparent to-90% md:from-30% md:to-75% lg:from-25% lg:to-70%"
        />

        <div className="relative px-6 py-8 pr-[26%] sm:px-8 sm:py-10 sm:pr-[30%] md:pr-[46%] lg:py-12 lg:pl-10 lg:pr-[52%]">
          <SectionHeading
            eyebrow="Explore universities"
            title="Find the right campus for you."
            lead="Discover universities, explore tours, and connect with current students."
            level={2}
            titleId="explore-unis"
          />

          <Link
            href="/universities"
            variant="primary"
            className="mt-6 inline-flex min-h-11 gap-2 sm:mt-7"
          >
            Browse all universities
            <Icon name="chevronRight" />
          </Link>
        </div>
      </Card>

      <UniversityQuickLinks className="mt-4" />
      <UniversityHighlights className="mt-4" />
    </Container>
  );
}
