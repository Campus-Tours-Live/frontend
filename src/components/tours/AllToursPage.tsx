"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Filter, RotateCcw, Search } from "lucide-react";
import { Alert, Button, Chip, Link, SectionHeading } from "@/components/ui";
import { useTourCatalog, type TourCatalogSort, type TourSummary } from "@/lib/data-access";
import { cn } from "@/lib/utils";
import { TourCatalogCard } from "./TourCatalogCard";

const TOPIC_FILTERS = [
  { value: "GENERAL_CAMPUS", label: "Campus life" },
  { value: "DORM_HOUSING", label: "Dorms & housing" },
  { value: "DINING_STUDENT_LIFE", label: "Dining & student life" },
  { value: "INTERNATIONAL_STUDENT", label: "International students" },
] as const;

const SORTS: { value: TourCatalogSort; label: string }[] = [
  { value: "RECOMMENDED", label: "Recommended" },
  { value: "RATING", label: "Top rated" },
  { value: "PRICE_ASC", label: "Lowest price" },
  { value: "PRICE_DESC", label: "Highest price" },
];

const UNIVERSITIES = [
  {
    name: "North Coast University",
    location: "Coastal city · mid-size campus",
    body: "Student life, hidden study spots, and first-year routines.",
    href: "/universities/north-coast",
  },
  {
    name: "Redwood State College",
    location: "College town · public research",
    body: "Engineering labs, student projects, and everyday campus rhythm.",
    href: "/universities/redwood-state",
  },
  {
    name: "Harborview University",
    location: "Urban waterfront · global community",
    body: "International student experience, housing, dining, and transit.",
    href: "/universities/harborview",
  },
  {
    name: "Blue Ridge Institute",
    location: "Mountain campus · compact community",
    body: "Residence halls, arts spaces, recreation, and quiet study corners.",
    href: "/universities/blue-ridge",
  },
];

function topicLabel(value: string): string {
  return TOPIC_FILTERS.find((t) => t.value === value)?.label ?? value;
}

function UniversityFallbackCard({ university }: { university: (typeof UNIVERSITIES)[number] }) {
  return (
    <article className="flex h-full flex-col rounded-panel border border-border bg-card p-5 shadow-card">
      <div className="self-start rounded-pill bg-primary-soft px-2.5 py-1 text-[12px] font-bold text-primary-dark">
        University
      </div>
      <h3 className="mt-3 font-display text-h4 text-ink">{university.name}</h3>
      <p className="mt-1 text-[13px] font-semibold text-primary-dark">{university.location}</p>
      <p className="mt-3 flex-1 text-[14px] text-ink-soft">{university.body}</p>
      <Link href={university.href} variant="secondary" size="sm" className="mt-5 w-full sm:w-auto">
        Explore university
        <ArrowRight size={15} strokeWidth={2} />
      </Link>
    </article>
  );
}

function Results({
  tours,
  loading,
  error,
  onReset,
  onRetry,
}: {
  tours: TourSummary[];
  loading: boolean;
  error: boolean;
  onReset: () => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading tours">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-panel border border-border bg-card p-5 shadow-card">
            <div className="h-32 rounded-card bg-canvas" />
            <div className="mt-5 h-4 w-28 rounded-pill bg-canvas" />
            <div className="mt-4 h-5 w-3/4 rounded-pill bg-canvas" />
            <div className="mt-3 h-4 w-full rounded-pill bg-canvas" />
            <div className="mt-6 h-10 w-32 rounded-pill bg-canvas" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <Alert variant="warning" role="status" className="max-w-2xl">
          <div>
            <h2 className="font-display text-h4 text-warning-foreground">
              Showing university suggestions
            </h2>
            <p className="mt-1 text-[13px]">
              We could not load live tours right now, so here are a few campuses to start from. Your
              filters are still saved.
            </p>
            <Button variant="ghost" size="sm" onClick={onRetry} className="mt-3 px-0">
              Try again
            </Button>
          </div>
        </Alert>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {UNIVERSITIES.slice(0, 3).map((u) => (
            <UniversityFallbackCard key={u.name} university={u} />
          ))}
        </div>
      </div>
    );
  }

  if (tours.length === 0) {
    return (
      <div className="rounded-panel border border-border bg-card p-8 shadow-card">
        <h2 className="font-display text-h3 text-ink">No tours match these filters</h2>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          Try broadening your date, topic, or university selection.
        </p>
        <Button variant="secondary" size="sm" onClick={onReset} className="mt-5">
          <RotateCcw size={15} strokeWidth={2} />
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {tours.map((tour) => (
        <TourCatalogCard key={tour.id} tour={tour} topicLabel={topicLabel(tour.topic)} />
      ))}
    </div>
  );
}

export function AllToursPage() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string>("");
  const [sort, setSort] = useState<TourCatalogSort>("RECOMMENDED");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = useMemo(
    () => ({
      q: query.trim() || undefined,
      topic: topic || undefined,
      sort,
      limit: 20,
    }),
    [query, sort, topic],
  );

  const { data: tours = [], isLoading, isError, refetch } = useTourCatalog(filters);
  const activeFilterCount = Number(Boolean(query.trim())) + Number(Boolean(topic));
  const resultTitle = isLoading
    ? "Loading tours"
    : isError
      ? "Available tours"
      : `${tours.length} tours`;

  const reset = () => {
    setQuery("");
    setTopic("");
    setSort("RECOMMENDED");
    void refetch();
  };

  const retry = () => {
    void refetch();
  };

  return (
    <div className="pb-24">
      <section className="border-b border-border/70 bg-ivory">
        <div className="mx-auto max-w-content px-6 py-12 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <SectionHeading
              eyebrow="Explore tours"
              title="Find a campus experience that matches what matters to you."
              lead="Search live, student-guided tours by school, topic, budget, and the questions you want answered before you visit or apply."
              level={1}
            />
            <div className="rounded-panel border border-border bg-card p-5 shadow-card">
              <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-primary-dark">
                Public marketplace
              </div>
              <p className="mt-2 text-[14px] text-ink-soft">
                Only published tours from approved student guides are shown.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <button
              type="button"
              className="mb-4 flex w-full items-center justify-between rounded-card border border-border bg-card px-4 py-3 text-left font-bold text-ink shadow-card lg:hidden"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
            >
              <span className="inline-flex items-center gap-2">
                <Filter size={17} strokeWidth={2} />
                Filters
              </span>
              <span className="text-[12px] text-ink-soft">{activeFilterCount} active</span>
            </button>

            <div
              className={cn(
                "space-y-6 rounded-panel border border-border bg-card p-5 shadow-card",
                !filtersOpen && "hidden lg:block",
              )}
            >
              <div>
                <h2 className="font-display text-h4 text-ink">Filters</h2>
                <p className="mt-1 text-[13px] text-ink-soft">Refine the public catalog.</p>
              </div>

              <label className="field block">
                <span>Search</span>
                <div className="relative mt-1.5">
                  <Search
                    size={16}
                    strokeWidth={2}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
                    aria-hidden
                  />
                  <input
                    className="input pl-9"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="University, tour, or topic"
                    type="search"
                  />
                </div>
              </label>

              <fieldset>
                <legend className="mb-2 block text-[13px] font-bold text-ink">Topic</legend>
                <div className="flex flex-wrap gap-2">
                  <Chip active={!topic} onClick={() => setTopic("")}>
                    Any
                  </Chip>
                  {TOPIC_FILTERS.map((t) => (
                    <Chip
                      key={t.value}
                      active={topic === t.value}
                      onClick={() => setTopic(t.value)}
                    >
                      {t.label}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              <label className="field block">
                <span>Sort by</span>
                <select
                  className="input mt-1.5"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as TourCatalogSort)}
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <Button variant="ghost" size="sm" onClick={reset} className="px-0">
                <RotateCcw size={15} strokeWidth={2} />
                Clear all
              </Button>
            </div>
          </aside>

          <div>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="eyebrow">Available tours</div>
                <h2 className="mt-1 font-display text-h3 text-ink">{resultTitle}</h2>
              </div>
              <p className="max-w-sm text-[13px] text-ink-soft">
                Live listings update as student guides publish new availability.
              </p>
            </div>

            <Results
              tours={tours}
              loading={isLoading}
              error={isError}
              onReset={reset}
              onRetry={retry}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-6">
        <div className="border-t border-border pt-10">
          <SectionHeading
            eyebrow="Universities"
            title="Browse by university"
            lead="Start with a campus, then choose a student guide and tour topic that fits your questions."
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {UNIVERSITIES.map((u) => (
              <UniversityFallbackCard key={u.name} university={u} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
