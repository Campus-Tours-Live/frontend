"use client";

import { useState } from "react";
import { Copy, ExternalLink, Pencil, Pause, Trash2 } from "lucide-react";
import { isAuthCancelled, SIGN_IN_AGAIN_MESSAGE } from "@/lib/auth";
import { Alert, Body, Button, Caption, Card, Heading, Link, StatusBadge } from "@/components/ui";
import {
  ApiError,
  useActivateOffering,
  useDuplicateOffering,
  usePauseOffering,
  useRetireOffering,
  type Offering,
} from "@/lib/data-access";
import { formatOfferingPrice } from "@/lib/format";
import { offeringStatusLabel, offeringStatusVariant } from "./offeringStatus";

export interface OfferingCardProps {
  offering: Offering;
  canPublish: boolean;
  topicLabel?: string;
}

export function OfferingCard({ offering, canPublish, topicLabel }: OfferingCardProps) {
  const activate = useActivateOffering();
  const pause = usePauseOffering();
  const retire = useRetireOffering();
  const duplicate = useDuplicateOffering();
  const [actionError, setActionError] = useState<string | null>(null);

  const isPublished = offering.status === "ACTIVE";
  const isEditable = offering.status === "DRAFT" || offering.status === "PAUSED";
  const isPublishable = offering.status === "DRAFT" || offering.status === "PAUSED";
  const publishDisabled = !canPublish || activate.isPending;
  const actionBusy =
    activate.isPending || pause.isPending || retire.isPending || duplicate.isPending;

  const handlePublish = async () => {
    setActionError(null);
    try {
      await activate.mutateAsync(offering.id);
    } catch (err) {
      if (isAuthCancelled(err)) {
        // Dismissing the sign-in prompt did not fail the publish — it never ran.
        setActionError(SIGN_IN_AGAIN_MESSAGE);
      } else if (err instanceof ApiError && err.status === 403) {
        setActionError("Your guide application must be approved before you can publish.");
      } else {
        setActionError("Could not publish this offering. Please try again.");
      }
    }
  };

  const runAction = async (action: () => Promise<unknown>, fallbackMessage: string) => {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      if (isAuthCancelled(err)) {
        setActionError(SIGN_IN_AGAIN_MESSAGE);
      } else if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError(fallbackMessage);
      }
    }
  };

  return (
    <Card as="article" padded={false} className="overflow-hidden rounded-panel">
      <Caption
        as="div"
        weight={500}
        className="flex h-[150px] items-center justify-center bg-canvas"
      >
        Campus tour image
      </Caption>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={offeringStatusVariant(offering.status)}>
            {offeringStatusLabel(offering.status)}
          </StatusBadge>
          <Caption>{isPublished ? "Visible publicly" : "Not public"}</Caption>
        </div>

        <Heading as="h3" size="h4" className="mt-3">
          {offering.title}
        </Heading>
        {offering.description ? (
          <Body size="medium" color="muted" className="mt-2 line-clamp-2">
            {offering.description}
          </Body>
        ) : null}

        <dl className="mt-4 grid grid-cols-3 gap-3 text-ui-sm">
          <div>
            <Body as="dt" size="small" color="muted">
              Duration
            </Body>
            <Body as="dd" size="small" weight={600} color="ink">
              {offering.durationMin} min
            </Body>
          </div>
          <div>
            <Body as="dt" size="small" color="muted">
              Price
            </Body>
            <Body as="dd" size="small" weight={600} color="ink">
              {formatOfferingPrice(offering.priceCents, offering.currency)}
            </Body>
          </div>
          <div>
            <Body as="dt" size="small" color="muted">
              Topic
            </Body>
            <Body as="dd" size="small" weight={600} color="ink">
              {topicLabel ?? offering.topic ?? "—"}
            </Body>
          </div>
        </dl>

        {actionError ? (
          <Alert variant="error" className="mt-4">
            {actionError}
          </Alert>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {isPublished ? (
            <Link href={`/tours/${offering.id}`} variant="secondary" size="small" target="_blank">
              <ExternalLink size={15} aria-hidden="true" />
              View public listing
            </Link>
          ) : null}
          {isEditable ? (
            <Link
              href={`/guide/tour-offerings/${offering.id}/edit`}
              variant="secondary"
              size="small"
            >
              <Pencil size={15} aria-hidden="true" />
              Edit
            </Link>
          ) : null}
          {isPublishable ? (
            <Button
              variant="primary"
              size="small"
              disabled={publishDisabled}
              onClick={handlePublish}
            >
              {activate.isPending ? "Publishing…" : "Publish"}
            </Button>
          ) : null}
          {isPublished ? (
            <Button
              variant="secondary"
              size="small"
              disabled={actionBusy}
              onClick={() =>
                void runAction(
                  () => pause.mutateAsync(offering.id),
                  "Could not pause this offering. Please try again.",
                )
              }
            >
              <Pause size={15} aria-hidden="true" />
              {pause.isPending ? "Pausing…" : "Pause"}
            </Button>
          ) : null}
          {offering.status !== "ARCHIVED" ? (
            <Button
              variant="ghost"
              size="small"
              disabled={actionBusy}
              onClick={() =>
                void runAction(
                  () => retire.mutateAsync(offering.id),
                  "Could not retire this offering. Please try again.",
                )
              }
            >
              <Trash2 size={15} aria-hidden="true" />
              {retire.isPending ? "Retiring…" : "Retire"}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="small"
            disabled={actionBusy}
            onClick={() =>
              void runAction(
                () => duplicate.mutateAsync(offering.id),
                "Could not duplicate this offering. Please try again.",
              )
            }
          >
            <Copy size={15} aria-hidden="true" />
            {duplicate.isPending ? "Duplicating…" : "Duplicate"}
          </Button>
          {!canPublish && isPublishable ? (
            <Caption as="p">Publishing unlocks after your guide application is approved.</Caption>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
