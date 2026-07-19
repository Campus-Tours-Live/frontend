import { Hero } from "@/components/home/Hero";
import { FeaturedTours } from "@/components/home/FeaturedTours";

/**
 * Home — route "/" from CampusToursLive-design_new.html (#home).
 * Public landing: explains product value and routes users into discovery or
 * guide acquisition. Content is hardcoded; links/CTAs are inert placeholders.
 * Header + <main> are provided by the (marketing) layout.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedTours />
    </>
  );
}
