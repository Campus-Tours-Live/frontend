import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TourDetail } from "@/components/tours/TourDetail";
import { getTourById, TOURS } from "@/lib/tours/mockTours";

interface TourDetailPageProps {
  params: Promise<{ tourId: string }>;
}

export function generateStaticParams() {
  return TOURS.map((tour) => ({ tourId: tour.id }));
}

export async function generateMetadata({ params }: TourDetailPageProps): Promise<Metadata> {
  const tour = getTourById((await params).tourId);
  return tour
    ? { title: `${tour.title} · ${tour.university} | CampusToursLive.ai` }
    : { title: "Tour not found | CampusToursLive.ai" };
}

export default async function TourDetailPage({ params }: TourDetailPageProps) {
  const tour = getTourById((await params).tourId);
  if (!tour) notFound();

  return (
    <>
      <SiteHeader />
      <TourDetail tour={tour} />
    </>
  );
}
