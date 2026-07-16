"use client";

import { useState } from "react";
import { Alert, Button, Card, Heading, StatusBadge } from "@/components/ui";
import { ApiError, useActivateOffering, type Offering } from "@/lib/data-access";
import { formatOfferingPrice } from "@/lib/format";
import { offeringStatusLabel, offeringStatusVariant } from "./offeringStatus";

export interface OfferingCardProps {
  offering: Offering;
  canPublish: boolean;
  topicLabel?: string;
}

export function OfferingCard({ offering, canPublish, topicLabel }: OfferingCardProps) {
  const activate = useActivateOffering();
  const [actionError, setActionError] = useState<string | null>(null);

  const isDraft = offering.status === "DRAFT";
  const isPublished = offering.status === "ACTIVE";
  const publishDisabled = !canPublish || activate.isPending;

  const handlePublish = async () => {
    setActionError(null);
    try {
      await activate.mutateAsync(offering.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setActionError("Your guide application must be approved before you can publish.");
      } else {
        setActionError("Could not publish this offering. Please try again.");
      }
    }
  };

  return (
    <Card as="article" padded={false} className="overflow-hidden rounded-panel">
      <div className="flex h-[150px] items-center justify-center bg-canvas text-[12px] font-medium text-ink-soft">
        Campus tour image
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={offeringStatusVariant(offering.status)}>
            {offeringStatusLabel(offering.status)}
          </StatusBadge>
          <span className="text-[12px] text-ink-soft">
            {isPublished ? "Visible publicly" : "Not public"}
          </span>
        </div>

        <Heading as="h3" size="h4" className="mt-3">
          {offering.title}
        </Heading>
        {offering.description ? (
          <p className="mt-2 line-clamp-2 text-[14px] text-ink-soft">{offering.description}</p>
        ) : null}

        <dl className="mt-4 grid grid-cols-3 gap-3 text-[13px]">
          <div>
            <dt className="text-ink-soft">Duration</dt>
            <dd className="font-semibold text-ink">{offering.durationMin} min</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Price</dt>
            <dd className="font-semibold text-ink">
              {formatOfferingPrice(offering.priceCents, offering.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Topic</dt>
            <dd className="font-semibold text-ink">{topicLabel ?? offering.topic ?? "—"}</dd>
          </div>
        </dl>

        {actionError ? (
          <Alert variant="error" className="mt-4">
            {actionError}
          </Alert>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {isDraft ? (
            <Button
              variant="primary"
              size="small"
              disabled={publishDisabled}
              onClick={handlePublish}
            >
              {activate.isPending ? "Publishing…" : "Publish"}
            </Button>
          ) : null}
          {!canPublish && isDraft ? (
            <p className="text-[12px] text-ink-soft">
              Publishing unlocks after your guide application is approved.
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
