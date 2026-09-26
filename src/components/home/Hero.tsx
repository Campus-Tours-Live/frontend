import Image from "next/image";
import { Body, Heading, Icon, Link, List, ListItem } from "@/components/ui";
import { assetUrl } from "@/lib/assets";

const TRUST_SIGNALS = [
  "Verified current students",
  "Secure payment authorization",
  "Recorded for safety",
];

/** Main home-page hero. */
export function Hero() {
  return (
    <section className="mx-auto grid max-w-content grid-cols-1 items-center gap-10 px-6 pb-16 pt-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:pt-[88px] xl:max-w-[1280px] 2xl:max-w-[1400px]">
      <div>
        <div className="eyebrow">Live-guided virtual campus tours</div>

        <Heading as="h1" size="display" className="mt-3 max-w-[720px]">
          Explore campus with someone who actually studies there.
        </Heading>

        <Body as="p" size="lead" color="muted" className="mt-5">
          Ask the questions you cannot find on the university website. Book a live tour with a
          verified student guide.
        </Body>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/tours" variant="primary">
            Explore tours
          </Link>
          <Link href="/signup/guide" variant="secondary">
            Become a guide
          </Link>
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

      <div className="w-full overflow-hidden rounded-panel border border-border shadow-card">
        <Image
          src={assetUrl("hero_campus.png")}
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
