"use client";

import { useMemo, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import {
  Alert,
  Badge,
  Body,
  Button,
  Card,
  Heading,
  Link,
  Pagination,
  SectionHeading,
  Skeleton,
} from "@/components/ui";
import {
  canonicalizeTopicIds,
  useTourCatalog,
  useTourFeatures,
  useTourTopics,
  type TourSummary,
} from "@/lib/data-access";
import { TourProductCard } from "./TourProductCard";
import { TourFiltersBar } from "./TourFiltersBar";
import { TourFiltersModal } from "./TourFiltersModal";
import { useTourListState } from "./useTourListState";
import { useResponsivePageWindow } from "./useResponsivePageWindow";

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

function UniversityFallbackCard({ university }: { university: (typeof UNIVERSITIES)[number] }) {
  return (
    <Card as="article" padded={false} className="flex h-full flex-col p-5">
      <Badge variant="primary" className="self-start">
        University
      </Badge>
      <Heading as="h3" size="h4" className="mt-3">
        {university.name}
      </Heading>
      <Body size="small" weight={600} color="primary-dark" className="mt-1">
        {university.location}
      </Body>
      <Body size="medium" color="muted" className="mt-3 flex-1">
        {university.body}
      </Body>
      <Link
        href={university.href}
        variant="secondary"
        size="small"
        className="mt-5 w-full sm:w-auto"
      >
        Explore university
        <ArrowRight size={15} strokeWidth={2} />
      </Link>
    </Card>
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
  // Backend-owned feature vocabulary (single source of truth) → code→label map for the chips.
  const { labelByCode: featureLabels } = useTourFeatures();

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3" aria-label="Loading tours">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <Skeleton height={128} className="rounded-card" />
            <Skeleton variant="rounded" height={16} width={112} className="mt-5" />
            <Skeleton variant="rounded" height={20} width="75%" className="mt-4" />
            <Skeleton variant="rounded" height={16} className="mt-3" />
            <Skeleton variant="rounded" height={40} width={128} className="mt-6" />
          </Card>
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
            <Button variant="ghost" size="small" onClick={onRetry} className="mt-3 px-0">
              Try again
            </Button>
          </div>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {UNIVERSITIES.slice(0, 3).map((u) => (
            <UniversityFallbackCard key={u.name} university={u} />
          ))}
        </div>
      </div>
    );
  }

  if (tours.length === 0) {
    return (
      <Card padded={false} className="p-8">
        <Heading as="h2" size="h3">
          No tours match these filters
        </Heading>
        <Body size="medium" color="muted" className="mt-2 max-w-xl">
          Try broadening your date, topic, or university selection.
        </Body>
        <Button variant="secondary" size="small" onClick={onReset} className="mt-5">
          <RotateCcw size={15} strokeWidth={2} />
          Clear filters
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
      {tours.map((tour) => (
        <TourProductCard
          key={tour.id}
          tour={tour}
          major={tour.guideMajor}
          degree={tour.guideDegree ?? undefined}
          entryYear={tour.guideEntryYear ?? undefined}
          featureLabels={featureLabels}
        />
      ))}
    </div>
  );
}

export function AllToursPage() {
  const {
    query,
    universityId,
    topicIds: rawTopicIds,
    sort,
    page,
    changeTopics,
    changeSort,
    setPage,
    reset: resetState,
  } = useTourListState();
  const [modalOpen, setModalOpen] = useState(false);
  const pageWindow = useResponsivePageWindow();

  const { data: topics } = useTourTopics();
  const allValues = useMemo(() => (topics ?? []).map((o) => o.value), [topics]);
  // Canonicalise the URL's topics for display + query so a full-set URL renders as "Any" (no
  // inversion) — the single authority for this rule is `canonicalizeTopicIds`.
  const topicIds = useMemo(
    () => canonicalizeTopicIds(rawTopicIds, allValues),
    [rawTopicIds, allValues],
  );

  const filters = useMemo(
    () => ({
      q: query.trim() || undefined,
      universityId: universityId || undefined,
      topicIds: topicIds.length ? topicIds : undefined,
      sort,
      page,
      // A common multiple of the grid's column counts (1/2/3/4) so every full page fills complete
      // rows at any width — no empty bottom-right cell on the 3-column desktop layout.
      limit: 24,
    }),
    [query, universityId, sort, topicIds, page],
  );

  const { data, isLoading, isError, refetch } = useTourCatalog(filters);
  const tours = data?.items ?? [];
  const resultTitle = isLoading
    ? "Loading tours"
    : isError
      ? "Available tours"
      : `${data?.totalElements ?? tours.length} tours`;

  const reset = () => {
    resetState();
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
              <Body
                as="div"
                size="small"
                weight={700}
                color="primary-dark"
                className="uppercase tracking-[0.08em]"
              >
                Public marketplace
              </Body>
              <Body size="medium" color="muted" className="mt-2">
                Only published tours from approved student guides are shown.
              </Body>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-6 py-10">
        <TourFiltersBar
          topicIds={topicIds}
          onTopicsChange={changeTopics}
          onOpenFilters={() => setModalOpen(true)}
        />
        <TourFiltersModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          sort={sort}
          resultCount={data?.totalElements ?? tours.length}
          onApply={({ sort: next }) => changeSort(next)}
        />

        <div className="mt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow">Available tours</div>
              <Heading as="h2" size="h3" className="mt-1">
                {resultTitle}
              </Heading>
            </div>
            <Body size="small" color="muted" className="max-w-sm">
              Live listings update as student guides publish new availability.
            </Body>
          </div>

          <Results
            tours={tours}
            loading={isLoading}
            error={isError}
            onReset={reset}
            onRetry={retry}
          />

          {!isLoading && !isError ? (
            <Pagination
              page={page}
              totalPages={data?.totalPages ?? 0}
              onPageChange={setPage}
              windowSize={pageWindow}
              className="mt-10"
            />
          ) : null}
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
