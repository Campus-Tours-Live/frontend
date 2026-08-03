"use client";

import Image from "next/image";
import { Card, Container, Icon, Link, SectionHeading } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { UniversityHighlights } from "./UniversityHighlights";
import { UniversityQuickLinks } from "./UniversityQuickLinks";

/**
 * ExploreUniversities — the universities CTA banner that sits below the featured tours on the
 * home page.
 *
 * The illustration is the card's BACKGROUND at every size, covering it edge to edge and anchored
 * right. A left-to-right scrim with explicit stops gives the copy a legible base without dimming
 * the building, which sits centre-right; the stops and the copy column widen together as the card
 * narrows, so text always wraps inside the solid part of the fade.
 *
 * Built from the UI library rather than bespoke markup: `Card` supplies the `.card` surface,
 * `SectionHeading` the eyebrow + title + lead trio used by every other section, and `Link
 * variant="primary"` the button-styled CTA (the same primitive the hero CTAs use, so it inherits
 * button styling while staying a real anchor).
 *
 * `"use client"` is required by `Card`, not by anything here — this banner has no state, effects
 * or handlers. `Card` renders `CardSizeContext.Provider`, and that context module is `"use client"`
 * while `Card` itself is not, so from a Server Component the Provider resolves to `undefined` and
 * React throws "Element type is invalid". Every other `<Card>` call site already sits inside a
 * client boundary, which is why the gap has never shown up. Drop this directive once `Card` is
 * server-safe.
 *
 * The illustration is decorative — the copy already says everything — hence the empty alt, which
 * also keeps it out of the accessibility tree where a background image belongs.
 */
export function ExploreUniversities() {
  return (
    // One <section> for the whole block — banner, quick links and highlight cards are three views
    // of a single idea, so they share one landmark and one heading rather than announcing three.
    <Container as="section" width="wide" className="pb-[90px]" aria-labelledby="explore-unis">
      <Card padded={false} className="relative overflow-hidden">
        {/* The art (2804×561, 5:1) covers the WHOLE card. Pinning it to the bottom at its own
            ratio instead leaves plain card showing above whenever the copy makes the card taller
            than width/5 — a white band with a hard sky-to-white seam on the right. `inset-0` +
            `object-cover` cannot leak by construction.

            Anchored right so the building and the trees beside it stay in frame; it is the left
            of the scene that gets cropped as the card grows relatively taller, and the left is
            what the scrim below covers anyway. */}
        <div className="pointer-events-none absolute inset-0 select-none">
          <Image
            src={assetUrl("hero_explore_universities.png")}
            alt=""
            fill
            /* Full card width at every size; the card is capped at 1400px on 2xl. Without this the
               browser assumes 100vw and pulls a needlessly large file on phones. */
            sizes="(min-width: 1280px) 1400px, 100vw"
            className="object-cover object-right"
          />
        </div>

        {/* Readability scrim. Its DIRECTION flips with the breakpoint, because the copy's shape
            does. Stops are always a percentage of the CARD, so one horizontal gradient cannot
            serve both: on a wide card the copy occupies a left column and a left-to-right fade is
            exactly right, but on a narrow card the lead wraps across nearly the full width, so
            that same fade leaves the end of every line sitting on trees.

            ALWAYS left-to-right. A top-down fade would have to sit over the upper half of the
            card, which is exactly where the cupola, roof and sky are — it hides the subject. Only
            the stops move with the breakpoint: narrow cards give the copy less room, so the solid
            part has to reach further before clearing. The copy column below is capped in step, so
            no line ever ends past the fade and out over the trees.

            Explicit stops throughout: the first version had none, so the implicit midpoint sat at
            50% opacity across the whole card and washed the artwork out. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-card from-45% to-transparent to-90% md:from-30% md:to-75% lg:from-25% lg:to-70%"
        />

        {/* Copy — `relative` lifts it above the art. The right inset is capped at every size, each
            step matched to the scrim's clearing point above, so lines wrap inside the solid part
            of the fade instead of running out over the scene. */}
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
            /* min-h-11 = 44px, the touch-target floor. `.btn`'s own padding lands ~41px, which is
               fine with a mouse and short on a phone. */
            className="mt-6 inline-flex min-h-11 gap-2 sm:mt-7"
          >
            Browse all universities
            {/* Icon marks itself aria-hidden when given no `title`, so the link's accessible
                name stays just the label. */}
            <Icon name="chevronRight" />
          </Link>
        </div>
      </Card>

      {/* Four ways in, then four campuses. Both rows share the banner's gutter and step through
          the same 1 → 2 → 4 column rhythm, so the block reads as one unit rather than three
          stacked widgets. */}
      <UniversityQuickLinks className="mt-4" />
      <UniversityHighlights className="mt-4" />
    </Container>
  );
}
