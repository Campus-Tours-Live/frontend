import { GraduationCap, ImageIcon, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { Body, Card, Heading, Icon, Link, SectionHeading, StatusBadge } from "@/components/ui";
import { type TourCardProps } from "@/components/tours/TourCard";
import { TourCarousel } from "@/components/tours/TourCarousel";

/**
 * University profile — route "/university".
 * Every "university" link on a TourCard points here for now: there is no
 * per-university detail endpoint yet (only GET /v1/universities?q= for the
 * onboarding typeahead search), so this page is a single hardcoded mock
 * profile shared by every university until that endpoint exists.
 */
const MOCK_UNIVERSITY = {
  name: "North Coast University",
  shortName: "NCU",
  city: "Arcata",
  region: "CA",
  about:
    "A mid-sized public university on California's north coast, known for its marine biology and environmental science programs, a walkable redwood-lined campus, and a tight-knit student community.",
  stats: [
    { value: "4 live tours", label: "From verified guides" },
    { value: "From $38", label: "Per live session" },
  ],
};

const MOCK_TOURS: TourCardProps[] = [
  {
    title: "Marine science labs & the campus quad",
    university: MOCK_UNIVERSITY.name,
    guide: "Priya S.",
    durationMinutes: 45,
    price: "$32.00",
  },
  {
    title: "Dorm life: a real freshman-year walkthrough",
    university: MOCK_UNIVERSITY.name,
    guide: "Jordan K.",
    durationMinutes: 30,
    price: "$25.00",
  },
  {
    title: "Engineering quad & the maker space",
    university: MOCK_UNIVERSITY.name,
    guide: "Marcus T.",
    durationMinutes: 60,
    price: "$40.00",
  },
  {
    title: "Redwood grove & the sustainability farm",
    university: MOCK_UNIVERSITY.name,
    guide: "Elena R.",
    durationMinutes: 40,
    price: "$28.00",
  },
  {
    title: "Game day: athletics & the student rec center",
    university: MOCK_UNIVERSITY.name,
    guide: "Devon W.",
    durationMinutes: 35,
    price: "$26.00",
  },
  {
    title: "Late-night study spots & the 24-hour library",
    university: MOCK_UNIVERSITY.name,
    guide: "Priya S.",
    durationMinutes: 25,
    price: "$20.00",
  },
];

export default function UniversityPage() {
  return (
    <main>
      <SiteHeader />

      <section className="mx-auto max-w-content px-6 pt-8 xl:max-w-[1280px] 2xl:max-w-[1400px]">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: MOCK_UNIVERSITY.name }]} />

        {/* Profile — image left, info stacked top-to-bottom on the right */}
        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          {/* Left — image placeholder until real campus photos are wired up */}
          <div className="relative flex h-[220px] items-center justify-center overflow-hidden rounded-panel border border-border bg-gradient-to-br from-sage-soft to-canvas shadow-card sm:h-[320px] lg:h-full lg:min-h-[360px]">
            <Icon icon={ImageIcon} size={40} strokeWidth={1.5} className="text-ink-soft/35" />
          </div>

          {/* Right — name, location, about, stats (top to bottom) */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <StatusBadge variant="success" className="w-fit">
                Verified campus
              </StatusBadge>
              <Heading as="h1" size="h2">
                {MOCK_UNIVERSITY.name}
              </Heading>
              <Body as="div" size="small" color="muted" className="flex items-center gap-1.5">
                <Icon icon={MapPin} size={14} className="shrink-0" />
                {MOCK_UNIVERSITY.city}, {MOCK_UNIVERSITY.region}
              </Body>
            </div>

            {/* About */}
            <div>
              <Heading as="h2" size="h4" className="mb-2 flex items-center gap-2">
                <Icon icon={GraduationCap} size={18} className="text-sage-deep" />
                About {MOCK_UNIVERSITY.shortName}
              </Heading>
              <p className="text-ink-soft">{MOCK_UNIVERSITY.about}</p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              {MOCK_UNIVERSITY.stats.map((stat) => (
                <Card key={stat.label} className="bg-canvas/50 text-center">
                  <div className="font-display text-[20px] font-extrabold text-ink">
                    {stat.value}
                  </div>
                  <div className="text-ui-sm text-ink-soft">{stat.label}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Available tours */}
        <div className="mt-10 pb-16">
          <div className="mb-6 flex items-end justify-between gap-5">
            <SectionHeading
              eyebrow="Live tours"
              title={`See ${MOCK_UNIVERSITY.name} through student eyes`}
            />
            {/* Desktop "View all" (mobile gets its own CTA below the stack, via TourCarousel) */}
            <Link href="#" className="hidden shrink-0 font-semibold text-primary lg:inline-block">
              View all tours
            </Link>
          </div>
          <TourCarousel tours={MOCK_TOURS} />
        </div>
      </section>
    </main>
  );
}
