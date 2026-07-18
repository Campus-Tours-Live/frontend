import Image from "next/image";
import { Button, Heading, Icon, List, ListItem } from "@/components/ui";

/**
 * Hero — home hero from design_new (#home .home-hero).
 * Two-column grid on desktop: copy on the left, campus illustration on the
 * right, vertically centered (grid-template-columns: 1.02fr .98fr; gap: 64px).
 * Collapses to a single stacked column below the lg breakpoint.
 * CTAs are inert placeholders for now.
 *
 * Image asset: save the campus illustration to `public/assets/hero-campus.png`.
 */
const TRUST_SIGNALS = [
  "Verified current students",
  "Secure payment authorization",
  "Recorded for safety",
];

export function Hero() {
  return (
    <section className="mx-auto grid max-w-content grid-cols-1 items-center gap-10 px-6 pb-16 pt-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:pt-[88px] xl:max-w-[1280px] 2xl:max-w-[1400px]">
      {/* Left — copy */}
      <div>
        <div className="eyebrow">Live-guided virtual campus tours</div>
        <Heading as="h1" size="display" className="mt-3 max-w-[720px]">
          Explore campus with someone who actually studies there.
        </Heading>
        <p className="lead mt-5">
          Ask the questions you cannot find on the university website. Book a live tour with a
          verified student guide.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="primary">Explore live tours</Button>
          <Button variant="secondary">Become a guide</Button>
        </div>

        <List dividers={false} className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          {TRUST_SIGNALS.map((signal) => (
            <ListItem
              key={signal}
              padded={false}
              className="gap-2"
              leading={<Icon name="success" className="text-sage-deep" />}
            >
              {signal}
            </ListItem>
          ))}
        </List>
      </div>

      {/* Right — campus illustration.
          Rendered at its intrinsic aspect ratio (w-full + h-auto) so the WHOLE
          image is always shown — never cropped — at any screen size. The box
          height simply follows the image. width/height are the asset's native
          pixels (used only to reserve space / avoid layout shift; h-auto uses
          the real ratio). */}
      <div className="w-full overflow-hidden rounded-panel border border-border shadow-card">
        <Image
          src="/assets/hero-campus.png"
          alt="Student guides and prospective students walking and talking on a sunlit campus quad"
          width={1536}
          height={1024}
          priority
          sizes="(max-width: 1024px) 100vw, 580px"
          className="h-auto w-full"
        />
      </div>
    </section>
  );
}
