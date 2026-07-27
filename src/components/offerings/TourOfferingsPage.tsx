"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Chip,
  Icon,
  InlineLoading,
  Link,
  Nudge,
  PageContainer,
  PageHeader,
} from "@/components/ui";
import { useGuideProfile, useOfferings, useTourTopics, type Offering } from "@/lib/data-access";
import { OfferingCard } from "./OfferingCard";
import { filterOfferings, type OfferingFilter } from "./offeringStatus";
import { QueryErrorAlert } from "@/components/auth/QueryErrorAlert";

const FILTERS: { id: OfferingFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "published", label: "Published" },
  { id: "retired", label: "Retired" },
];

export function TourOfferingsPage() {
  // /guide/tour-offerings is guide-only, so this always applies (no enabled-gating needed).
  const { data: guideProfile } = useGuideProfile();
  const { data: offerings = [], isLoading, isError, error } = useOfferings();
  const { data: topics = [] } = useTourTopics();
  const [filter, setFilter] = useState<OfferingFilter>("all");

  const canPublish = guideProfile?.applicationStatus === "APPROVED";

  const topicByValue = useMemo(() => new Map(topics.map((t) => [t.value, t.label])), [topics]);

  const visible = filterOfferings(offerings, filter);

  return (
    <PageContainer width="wide">
      <PageHeader
        title="Tour offerings"
        lead="Manage the public tour products participants can discover and book."
        action={
          <Link href="/guide/tour-offerings/new" variant="primary">
            Create tour offering
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((tab) => (
          <Chip key={tab.id} active={filter === tab.id} onClick={() => setFilter(tab.id)}>
            {tab.label}
          </Chip>
        ))}
      </div>

      {isLoading ? <InlineLoading label="Loading offerings…" /> : null}

      {isError ? (
        <QueryErrorAlert error={error}>Failed to load your tour offerings.</QueryErrorAlert>
      ) : null}

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

      <Nudge
        variant="info"
        leading={<Icon name="info" />}
        title="You may save drafts before verification"
      >
        Only complete offerings owned by a verified guide can be published. Editing or retiring an
        offering does not change existing bookings.
      </Nudge>
    </PageContainer>
  );
}
