"use client";

import Image from "next/image";
import { Container, SectionHeading } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { ExploreByState } from "./ExploreByState";

/**
 * BrowseByStatePage — the destination behind the home page's "Browse by state" tile.
 *
 * <p>ONE heading over ONE task. This page used to carry three sections: a state list, the map, and
 * a second "Popular states" row of image cards below it. The first and third did the same job — the
 * same eight state names, twice, with the map in between — so a visitor scrolled past a map to
 * reach a duplicate of what they had already seen. The card row is gone; picking a state happens in
 * exactly one place.
 *
 * <p>The heading says what is here and why, not how to work the controls. "Select a state on the
 * map, or search and browse the list" described three widgets a visitor can already see; it never
 * said what they would find behind them. Naming the universities AND the student-led tours is the
 * reason to browse by state at all.
 *
 * <p>Dropping it also removed a class of bug rather than just some markup: two Popular entries
 * would have needed the same eight codes, the same order, the same counts and the same click
 * target kept in step forever, and nothing but discipline would have kept them there.
 *
 * <p>There is NO current-state concept here. Nothing selects, nothing recolours, nothing is
 * announced — a page whose only job is browsing has nowhere to put a "chosen" state and no question
 * that answer belongs to. Hovering or focusing a state on the map raises it, and that is the whole
 * interaction until per-state routes exist.
 */
export function BrowseByStatePage() {
  return (
    /**
     * The page frame is `AllToursPage`'s, copied rather than approximated: outer `pb-24`, a
     * full-bleed heading band, then the content in its own `Container as="section"`. Same
     * default-width `Container` throughout, so the same `px-6` gutter and the same 1180px cap.
     *
     * The BAND is the part that was missing. Arriving here from the home page's tile leaves the
     * page a few dozen pixels down — the App Router scrolls the new content into view, and a fixed
     * header sits over the top of it. With the title sitting directly under `pt-12` that was enough
     * to bury it. Inside a band with `py-12 lg:py-16` the same scroll eats band padding instead,
     * which is exactly how the tours page absorbs it. Matching the reference beats inventing a
     * `scroll-margin` this page would be alone in having.
     */
    <div className="pb-24">
      <section className="border-b border-border/70 bg-muted">
        <Container className="py-12 lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="max-w-2xl">
              {/* `SectionHeading` with `level={1}`, not `PageHeader`: the eyebrow lives here — the
                  page-header component omits eyebrows on purpose — and it is what the tours hero
                  uses in the same band. */}
              <SectionHeading
                eyebrow="Browse by state"
                title="Find universities and campus tours by state"
                lead="Explore universities across the U.S. and discover live campus tours led by current students. Search for a state, browse the list, or select one on the map."
                level={1}
              />
            </div>

            {/* Hero illustration — scales with its column and keeps its own ratio; hidden below
                `lg`, where there is no room for it beside the copy and it would only push the
                controls further down a phone screen.

                `alt=""` because it is decorative: it repeats what the heading beside it already
                says, so announcing it would make a screen reader hear the same thing twice. The
                intrinsic 1672×941 is passed so Next reserves the right box and the band does not
                reflow when the image lands. */}
            <div className="hidden lg:block">
              <Image
                src={assetUrl("hero_browse_by_state.png")}
                alt=""
                width={1672}
                height={941}
                priority
                sizes="(min-width: 1024px) 48vw, 0px"
                className="h-auto w-full rounded-panel shadow-card"
              />
            </div>
          </div>
        </Container>
      </section>

      <Container as="section" className="py-10">
        <ExploreByState />
      </Container>
    </div>
  );
}
