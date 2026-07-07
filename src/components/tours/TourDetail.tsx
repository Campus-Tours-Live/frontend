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
import { Badge, Button, Icon, Link, StatusBadge } from "@/components/ui";
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

export function TourDetail({ tour }: { tour: TourDetailData }) {
  const location = campusLocation(tour);
  const languages = tour.languages?.length ? tour.languages.join(" · ") : "Ask the guide";

  return (
    <main>
      <section className="border-b border-border/70 bg-gradient-to-b from-sage-soft/70 to-background">
        <div className="mx-auto max-w-content px-6 pb-10 pt-8 md:pb-14 md:pt-12">
          <Link href="/" className="text-[14px] font-bold text-primary-dark">
            ← Back to tours
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)] lg:items-start">
            <div>
              <div className="relative grid min-h-[300px] place-items-center overflow-hidden rounded-hero border border-border bg-gradient-to-br from-primary-soft via-card to-sage-soft shadow-card md:min-h-[430px]">
                <div className="text-center text-ink-soft/55">
                  <Icon icon={ImageIcon} size={54} strokeWidth={1.2} className="mx-auto" />
                  <p className="mt-3 text-[13px] font-bold">Campus tour preview</p>
                </div>
                <StatusBadge
                  variant="success"
                  className="absolute left-5 top-5 bg-card/95 shadow-sm"
                >
                  Active tour
                </StatusBadge>
                {location ? (
                  <span className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-pill bg-card/95 px-4 py-2 text-[13px] font-bold text-ink shadow-sm">
                    <Icon icon={MapPin} size={15} className="text-primary" />
                    {location}
                  </span>
                ) : null}
              </div>

              <div className="mt-8">
                <div className="eyebrow">{tour.universityName}</div>
                <h1 className="mt-2 max-w-3xl font-display text-[clamp(36px,5vw,58px)] font-bold leading-[1.05] tracking-[-0.04em] text-ink">
                  {tour.title}
                </h1>
                <p className="mt-5 max-w-3xl text-lead text-ink-soft">
                  {tour.description || "Ask the guide about this live campus experience."}
                </p>
              </div>
            </div>

            <aside className="card p-5 lg:sticky lg:top-6 lg:p-6">
              <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
                <div>
                  <div className="text-[13px] font-bold text-ink-soft">Price per participant</div>
                  <div className="mt-1 font-display text-[34px] font-bold leading-none text-ink">
                    {formatOfferingPrice(tour.priceCents, tour.currency)}
                  </div>
                </div>
                <Badge variant="sage">{tour.topic.replaceAll("_", " ")}</Badge>
              </div>

              <dl className="space-y-3 py-5">
                <div className="flex items-center gap-3 rounded-card bg-ivory px-4 py-3">
                  <Icon icon={Clock3} size={18} className="text-primary" />
                  <div>
                    <dt className="caption">Duration</dt>
                    <dd className="font-bold">{tour.durationMin} minutes</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-card bg-ivory px-4 py-3">
                  <Icon icon={Languages} size={18} className="text-primary" />
                  <div>
                    <dt className="caption">Languages</dt>
                    <dd className="font-bold">{languages}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-card bg-ivory px-4 py-3">
                  <Icon icon={Star} size={18} className="text-amber" />
                  <div>
                    <dt className="caption">Reviews</dt>
                    <dd className="font-bold">
                      {tour.reviewCount > 0
                        ? `${tour.avgRating.toFixed(1)} from ${tour.reviewCount} reviews`
                        : "New tour"}
                    </dd>
                  </div>
                </div>
              </dl>

              <Button block size="lg" disabled>
                Times coming soon
              </Button>
              <p className="mt-3 text-center text-[12px] leading-relaxed text-ink-soft">
                Bookable time slots are not available from the API yet.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-content gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-16">
        <section className="card p-6 md:p-8" aria-labelledby="questions-heading">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-coral-soft text-coral-foreground">
              <Icon icon={MessageCircleQuestion} size={21} />
            </span>
            <div>
              <h2 id="questions-heading" className="h3">
                Ask what university websites cannot tell you
              </h2>
              <p className="mt-2 text-body text-ink-soft">
                Live tours are designed for questions about classes, housing, food, student life,
                and the everyday campus experience.
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="card p-6" aria-labelledby="guide-heading">
            <div className="eyebrow">Meet your guide</div>
            <div className="mt-4 flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-role-guide-soft font-display text-[20px] font-bold text-role-guide-foreground">
                {guideInitials(tour.guideDisplayName)}
              </div>
              <div>
                <h2 id="guide-heading" className="h3">
                  {tour.guideDisplayName}
                </h2>
                <p className="mt-1 text-[13px] font-semibold text-ink-soft">
                  Approved campus guide
                </p>
              </div>
            </div>
            <StatusBadge variant="success" className="mt-5">
              <Icon icon={GraduationCap} size={14} /> Approved guide
            </StatusBadge>
            {tour.guideBio ? <p className="mt-4 text-body text-ink-soft">{tour.guideBio}</p> : null}
          </section>

          <section
            className="rounded-panel border border-primary/20 bg-primary-soft/60 p-6"
            aria-labelledby="safety-heading"
          >
            <div className="flex gap-3">
              <Icon icon={ShieldCheck} size={24} className="text-primary-dark" />
              <div>
                <h2 id="safety-heading" className="font-display text-[18px] font-bold text-ink">
                  Marketplace verified
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                  The marketplace only lists active tours from approved guides at active
                  universities.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
