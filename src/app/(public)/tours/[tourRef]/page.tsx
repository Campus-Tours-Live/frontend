import type { Metadata } from "next";
import { TourDetailPage } from "@/components/tours/TourDetailPage";

export const metadata: Metadata = {
  title: "Tour detail — CampusToursLive.ai",
  description: "Choose a live, student-guided campus tour time in your local timezone.",
};

export default async function TourDetailRoute({
  params,
}: {
  params: Promise<{ tourRef: string }>;
}) {
  const { tourRef } = await params;
  return <TourDetailPage tourRef={tourRef} />;
}
