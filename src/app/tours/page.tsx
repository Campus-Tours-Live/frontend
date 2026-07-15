import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { AllToursPage } from "@/components/tours/AllToursPage";

export const metadata: Metadata = {
  title: "Explore tours — CampusToursLive.ai",
  description: "Browse live, student-guided campus tours by school, topic, budget, and guide.",
};

export default function ToursPage() {
  return (
    <main>
      <SiteHeader />
      <AllToursPage />
    </main>
  );
}
