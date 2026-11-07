import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TourDetailRoute } from "@/components/tours/TourDetailRoute";

export const metadata: Metadata = {
  title: "Tour details | CampusToursLive.ai",
};

interface TourDetailPageProps {
  params: Promise<{ tourId: string }>;
}

export default async function TourDetailPage({ params }: TourDetailPageProps) {
  const { tourId } = await params;

  return (
    <>
      <SiteHeader />
      <TourDetailRoute tourId={tourId} />
    </>
  );
}
