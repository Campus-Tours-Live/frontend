"use client";

import { Alert, InlineLoading, Link, PageContainer } from "@/components/ui";
import { QueryErrorAlert } from "@/components/auth/QueryErrorAlert";
import { useOfferings } from "@/lib/data-access";
import { CreateOfferingForm } from "./CreateOfferingForm";

/** Edit route backed by the guide's already-authorized own-offerings collection. */
export function EditOfferingPage({ offeringId }: { offeringId: string }) {
  const { data: offerings = [], isLoading, isError, error } = useOfferings();

  if (isLoading) {
    return (
      <PageContainer width="wide">
        <InlineLoading label="Loading offering…" />
      </PageContainer>
    );
  }
  if (isError) {
    return (
      <PageContainer width="wide">
        <QueryErrorAlert error={error}>Failed to load this offering.</QueryErrorAlert>
      </PageContainer>
    );
  }

  const offering = offerings.find((item) => item.id === offeringId);
  if (!offering) {
    return (
      <PageContainer width="wide">
        <Alert variant="warning">
          This offering was not found.{" "}
          <Link href="/guide/tour-offerings">Return to your offerings</Link>
        </Alert>
      </PageContainer>
    );
  }
  if (offering.status === "ACTIVE" || offering.status === "ARCHIVED") {
    return (
      <PageContainer width="wide">
        <Alert variant="info">
          {offering.status === "ACTIVE"
            ? "Pause this public offering before editing it."
            : "Retired offerings cannot be edited. Duplicate it to create a new draft."}{" "}
          <Link href="/guide/tour-offerings">Return to your offerings</Link>
        </Alert>
      </PageContainer>
    );
  }

  return <CreateOfferingForm offering={offering} />;
}
