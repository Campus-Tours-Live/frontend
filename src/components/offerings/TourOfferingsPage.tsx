"use client";

import { useMemo, useState } from "react";
import { Alert, Chip, Link, SectionHeading, Spinner } from "@/components/ui";
import { useMe, useOfferings, useTourTopics, type Offering } from "@/lib/data-access";
import { OfferingCard } from "./OfferingCard";
import { filterOfferings, type OfferingFilter } from "./offeringStatus";

const FILTERS: { id: OfferingFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "published", label: "Published" },
  { id: "retired", label: "Retired" },
];

export function TourOfferingsPage() {
  const { me } = useMe();
  const { data: offerings = [], isLoading, isError } = useOfferings();
  const { data: topics = [] } = useTourTopics();
  const [filter, setFilter] = useState<OfferingFilter>("all");

  const canPublish = me?.guideStatus === "APPROVED";

  const topicByValue = useMemo(() => new Map(topics.map((t) => [t.value, t.label])), [topics]);

  const visible = filterOfferings(offerings, filter);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          title="Tour offerings"
          lead="Manage the public tour products participants can discover and book."
          level={1}
        />
        <Link href="/guide/tour-offerings/new" variant="primary">
          Create tour offering
        </Link>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((tab) => (
          <Chip key={tab.id} active={filter === tab.id} onClick={() => setFilter(tab.id)}>
            {tab.label}
          </Chip>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-ink-soft">
          <Spinner />
          Loading offerings…
        </div>
      ) : null}

      {isError ? <Alert variant="error">Failed to load your tour offerings.</Alert> : null}

      {!isLoading && !isError && visible.length === 0 ? (
        <Alert variant="info">
          {offerings.length === 0
            ? "You have no tour offerings yet. Create one to get started."
            : "No offerings match this filter."}
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {visible.map((offering: Offering) => (
          <OfferingCard
            key={offering.id}
            offering={offering}
            canPublish={Boolean(canPublish)}
            topicLabel={
              offering.topic ? (topicByValue.get(offering.topic) ?? offering.topic) : undefined
            }
          />
        ))}
      </div>

      <div className="rounded-panel border border-border bg-canvas p-5 text-[13px] text-ink-soft">
        You may save drafts before verification. Only complete offerings owned by a verified guide
        can be published. Editing or retiring an offering does not change existing bookings.
      </div>
    </div>
  );
}
