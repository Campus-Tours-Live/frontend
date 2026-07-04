import {
  CalendarDays,
  Check,
  Clock3,
  Globe2,
  GraduationCap,
  ImageIcon,
  Languages,
  MapPin,
  MessageCircleQuestion,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge, Icon, Link, StatusBadge } from "@/components/ui";
import type { TourDetail as TourDetailData } from "@/lib/tours/mockTours";

function DetailFact({
  icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-3 rounded-card bg-ivory px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-card text-primary shadow-sm">
        <Icon icon={icon} size={18} />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-soft">
          {label}
        </div>
        <div className="mt-0.5 text-[14px] font-bold text-ink">{value}</div>
      </div>
    </div>
  );
}

export function TourDetail({ tour }: { tour: TourDetailData }) {
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
                  Live guided tour
                </StatusBadge>
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                  <span className="inline-flex items-center gap-2 rounded-pill bg-card/95 px-4 py-2 text-[13px] font-bold text-ink shadow-sm">
                    <Icon icon={MapPin} size={15} className="text-primary" />
                    {tour.campusLocation}
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <div className="eyebrow">{tour.university}</div>
                <h1 className="mt-2 max-w-3xl font-display text-[clamp(36px,5vw,58px)] font-bold leading-[1.05] tracking-[-0.04em] text-ink">
                  {tour.title}
                </h1>
                <p className="mt-5 max-w-3xl text-lead text-ink-soft">{tour.description}</p>
              </div>
            </div>

            <aside className="card p-5 lg:sticky lg:top-6 lg:p-6">
              <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
                <div>
                  <div className="text-[13px] font-bold text-ink-soft">Price per participant</div>
                  <div className="mt-1 font-display text-[38px] font-bold leading-none text-ink">
                    ${tour.price}
                  </div>
                </div>
                <Badge variant="coral">{tour.spotsLeft} spots left</Badge>
              </div>

              <div className="space-y-3 py-5">
                <DetailFact icon={CalendarDays} label="Date" value={tour.dateLabel} />
                <DetailFact
                  icon={Clock3}
                  label="Time"
                  value={`${tour.timeLabel} · ${tour.timeZone}`}
                />
                <DetailFact
                  icon={Globe2}
                  label="Duration"
                  value={`${tour.durationMinutes} minutes`}
                />
                <DetailFact icon={Languages} label="Languages" value={tour.language} />
              </div>

              <Link
                href={`/signin?returnTo=${encodeURIComponent(`/tours/${tour.id}`)}`}
                variant="primary"
                size="lg"
                block
              >
                Book this live tour
              </Link>
              <p className="mt-3 text-center text-[12px] leading-relaxed text-ink-soft">
                You will review the details before payment.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-content gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-16">
        <div className="space-y-8">
          <section className="card p-6 md:p-8" aria-labelledby="tour-highlights">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-pill bg-primary-soft text-primary-dark">
                <Icon icon={MapPin} size={21} />
              </span>
              <div>
                <div className="eyebrow">Tour route</div>
                <h2 id="tour-highlights" className="h3 mt-1">
                  What you will explore
                </h2>
              </div>
            </div>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {tour.stops.map((stop) => (
                <li
                  key={stop}
                  className="flex gap-3 rounded-card bg-sage-soft/60 p-4 text-[15px] font-semibold text-ink"
                >
                  <Icon icon={Check} size={18} className="mt-0.5 text-success-foreground" />
                  {stop}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              {tour.topics.map((topic) => (
                <Badge key={topic} variant="sage">
                  {topic}
                </Badge>
              ))}
            </div>
          </section>

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
                  This is a live, two-way tour. Ask Maya about classes, housing, food, making
                  friends, or the international student experience as you explore together.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-6" aria-labelledby="guide-heading">
            <div className="eyebrow">Meet your guide</div>
            <div className="mt-4 flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-role-guide-soft font-display text-[20px] font-bold text-role-guide-foreground">
                {tour.guide.initials}
              </div>
              <div>
                <h2 id="guide-heading" className="h3">
                  {tour.guide.name}
                </h2>
                <p className="mt-1 text-[13px] font-semibold text-ink-soft">
                  {tour.guide.major} · {tour.guide.year}
                </p>
              </div>
            </div>
            {tour.guide.verified && (
              <StatusBadge variant="success" className="mt-5">
                <Icon icon={GraduationCap} size={14} /> Verified current student
              </StatusBadge>
            )}
            <p className="mt-4 text-body text-ink-soft">{tour.guide.bio}</p>
          </section>

          <section
            className="rounded-panel border border-primary/20 bg-primary-soft/60 p-6"
            aria-labelledby="safety-heading"
          >
            <div className="flex gap-3">
              <Icon icon={ShieldCheck} size={24} className="text-primary-dark" />
              <div>
                <h2 id="safety-heading" className="font-display text-[18px] font-bold text-ink">
                  Safe and student-friendly
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                  Guides are verified current students. Tours may be recorded for safety, and you
                  can cancel up to 24 hours before the start time.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 shadow-[0_-8px_30px_rgba(47,52,55,0.1)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-content items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="font-display text-[22px] font-bold text-ink">${tour.price}</div>
            <div className="flex items-center gap-1 text-[12px] font-semibold text-ink-soft">
              <Icon icon={Users} size={13} /> {tour.spotsLeft} spots left
            </div>
          </div>
          <Link
            href={`/signin?returnTo=${encodeURIComponent(`/tours/${tour.id}`)}`}
            variant="primary"
          >
            Book tour
          </Link>
        </div>
      </div>
    </main>
  );
}
