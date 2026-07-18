import {
  Clock3,
  GraduationCap,
  ImageIcon,
  Languages,
  MapPin,
  MessageCircleQuestion,
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Heading,
  Icon,
  Link,
  Nudge,
  StatusBadge,
} from "@/components/ui";
import { formatOfferingPrice } from "@/lib/format";
import type { TourDetail as TourDetailData } from "@/lib/data-access";

function guideInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function campusLocation(tour: TourDetailData): string {
  return [tour.universityCity, tour.universityRegion].filter(Boolean).join(", ");
}

function topicLabel(topic: string): string {
  return topic.replaceAll("_", " ");
}

export function TourDetail({ tour }: { tour: TourDetailData }) {
  const location = campusLocation(tour);
  const languages = tour.languages?.length ? tour.languages.join(" · ") : "Ask the guide";

  return (
    <main>
      <section className="border-b border-border/70 bg-gradient-to-b from-sage-soft/70 to-background">
        <div className="mx-auto max-w-content px-6 pb-10 pt-8 md:pb-14 md:pt-12">
          <Link href="/" className="font-semibold text-primary-dark">
            ← Back to tours
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)] lg:items-start">
            <div>
              <Card
                padded={false}
                className="relative grid min-h-[300px] place-items-center overflow-hidden rounded-hero bg-gradient-to-br from-primary-soft via-card to-sage-soft md:min-h-[430px]"
              >
                <div className="text-center text-ink-soft/55">
                  <Icon icon={ImageIcon} size={54} strokeWidth={1.2} className="mx-auto" />
                  <Caption as="p" weight={700} className="mt-3">
                    Campus tour preview
                  </Caption>
                </div>
                <StatusBadge
                  variant="success"
                  className="absolute left-5 top-5 bg-card/95 shadow-sm"
                >
                  Active tour
                </StatusBadge>
                {location ? (
                  <span className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-pill bg-card/95 px-4 py-2 text-ui-sm font-bold text-ink shadow-sm">
                    <Icon icon={MapPin} size={15} className="text-primary" />
                    {location}
                  </span>
                ) : null}
              </Card>

              <div className="mt-8">
                <div className="eyebrow">{tour.universityName}</div>
                <Heading as="h1" size="display" className="mt-2 max-w-3xl">
                  {tour.title}
                </Heading>
                <Body size="lead" color="muted" className="mt-5 max-w-3xl">
                  {tour.description || "Ask the guide about this live campus experience."}
                </Body>
              </div>
            </div>

            <Card as="aside" className="lg:sticky lg:top-6" size="large">
              <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
                <div>
                  <Caption as="div" weight={700}>
                    Price per participant
                  </Caption>
                  <div className="mt-1 font-display text-[34px] font-bold leading-none text-ink">
                    {formatOfferingPrice(tour.priceCents, tour.currency)}
                  </div>
                </div>
                <Badge variant="sage">{topicLabel(tour.topic)}</Badge>
              </div>

              <dl className="space-y-3 py-5">
                <div className="flex items-center gap-3 rounded-card bg-ivory px-4 py-3">
                  <Icon icon={Clock3} size={18} className="text-primary" />
                  <div>
                    <Caption as="dt">Duration</Caption>
                    <dd className="font-bold">{tour.durationMin} minutes</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-card bg-ivory px-4 py-3">
                  <Icon icon={Languages} size={18} className="text-primary" />
                  <div>
                    <Caption as="dt">Languages</Caption>
                    <dd className="font-bold">{languages}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-card bg-ivory px-4 py-3">
                  <Icon icon={Star} size={18} className="text-amber" />
                  <div>
                    <Caption as="dt">Reviews</Caption>
                    <dd className="font-bold">
                      {tour.reviewCount > 0
                        ? `${tour.avgRating.toFixed(1)} from ${tour.reviewCount} reviews`
                        : "New tour"}
                    </dd>
                  </div>
                </div>
              </dl>

              <Button block size="large" disabled>
                Times coming soon
              </Button>
              <Caption as="p" className="mt-3 text-center leading-relaxed">
                Bookable time slots are not available from the API yet.
              </Caption>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-content gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-16">
        <Card as="section" size="large" aria-labelledby="questions-heading">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-coral-soft text-coral-foreground">
              <Icon icon={MessageCircleQuestion} size={21} />
            </span>
            <div>
              <Heading id="questions-heading" as="h2" size="h3">
                Ask what university websites cannot tell you
              </Heading>
              <Body color="muted" className="mt-2">
                Live tours are designed for questions about classes, housing, food, student life,
                and the everyday campus experience.
              </Body>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card as="section" aria-labelledby="guide-heading">
            <div className="eyebrow">Meet your guide</div>
            <div className="mt-4 flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-role-guide-soft font-display text-[20px] font-bold text-role-guide-foreground">
                {guideInitials(tour.guideDisplayName)}
              </div>
              <div>
                <Heading id="guide-heading" as="h2" size="h3">
                  {tour.guideDisplayName}
                </Heading>
                <Caption as="p" weight={600} className="mt-1">
                  Approved campus guide
                </Caption>
              </div>
            </div>
            <StatusBadge variant="success" className="mt-5">
              <Icon icon={GraduationCap} size={14} /> Approved guide
            </StatusBadge>
            {tour.guideBio ? (
              <Body color="muted" className="mt-4">
                {tour.guideBio}
              </Body>
            ) : null}
          </Card>

          <Nudge
            variant="info"
            role="status"
            title="Marketplace verified"
            leading={<Icon icon={ShieldCheck} size={24} aria-hidden />}
          >
            The marketplace only lists active tours from approved guides at active universities.
          </Nudge>
        </div>
      </section>
    </main>
  );
}
