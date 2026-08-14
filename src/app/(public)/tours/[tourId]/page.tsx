import type { Metadata } from "next";
import { TourDetailPage } from "@/components/tours/TourDetailPage";

export const metadata: Metadata = {
  title: "Tour details | CampusToursLive.ai",
};

export default async function PublicTourDetailRoutePage({
  params,
}: {
  params: Promise<{ tourId: string }>;
}) {
  const { tourId } = await params;
  return <TourDetailPage tourId={tourId} />;
}
