import type { Metadata } from "next";
import { BrowseByStatePage } from "@/components/universities/BrowseByStatePage";

export const metadata: Metadata = {
  title: "Browse universities by state — CampusToursLive.ai",
  description:
    "Scan the university directory by state or alphabetically, then explore live student-guided tours.",
};

// Header + <main> are provided by the (public) layout.
export default function UniversitiesByStatePage() {
  return <BrowseByStatePage />;
}
