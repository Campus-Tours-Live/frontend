import { Suspense } from "react";
import type { Metadata } from "next";
import { AllToursPage } from "@/components/tours/AllToursPage";

export const metadata: Metadata = {
  title: "Explore tours — CampusToursLive.ai",
  description: "Browse live, student-guided campus tours by school, topic, budget, and guide.",
};

// Header + <main> are provided by the (public) layout.
export default function ToursPage() {
  return (
    <Suspense>
      <AllToursPage />
    </Suspense>
  );
}
