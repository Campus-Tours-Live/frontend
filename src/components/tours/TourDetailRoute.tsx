"use client";

import { Alert, Link, Spinner } from "@/components/ui";
import { ApiError, useTourDetail } from "@/lib/data-access";
import { TourDetail } from "./TourDetail";

export function TourDetailRoute({ tourId }: { tourId: string }) {
  const { data, isLoading, error } = useTourDetail(tourId);

  if (isLoading) {
    return (
      <main className="mx-auto flex max-w-content items-center gap-3 px-6 py-20 text-ink-soft">
        <Spinner /> Loading tour details…
      </main>
    );
  }

  if (error || !data) {
    const status = error instanceof ApiError ? error.status : null;
    return (
      <main className="mx-auto max-w-content px-6 py-20">
        <Alert variant={status === 404 ? "info" : "error"}>
          {status === 401
            ? "Please sign in to view the live tour catalog."
            : status === 404
              ? "This tour is no longer available."
              : "Tour details could not be loaded right now."}
        </Alert>
        <div className="mt-5 flex gap-4">
          {status === 401 ? (
            <Link
              href={`/signin?returnTo=${encodeURIComponent(`/tours/${tourId}`)}`}
              variant="primary"
            >
              Sign in
            </Link>
          ) : null}
          <Link href="/tours" variant="secondary">
            Back to tours
          </Link>
        </div>
      </main>
    );
  }

  return <TourDetail tour={data} />;
}
