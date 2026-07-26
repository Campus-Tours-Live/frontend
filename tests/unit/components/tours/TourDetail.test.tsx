import { render, screen } from "@testing-library/react";
import { TourDetail } from "@/components/tours/TourDetail";
import type { TourDetail as TourDetailData } from "@/lib/data-access";

const tour: TourDetailData = {
  id: "a0000000-0000-4000-8000-000000000001",
  title: "North Campus highlights",
  slug: "north-campus-highlights",
  topic: "GENERAL_CAMPUS",
  description: "A guided walk through the north campus.",
  languages: ["en-US", "zh-CN"],
  universityId: "university-id",
  universityName: "North Coast University",
  universityImageUrl: null,
  universitySlug: "north-coast",
  universityCity: "Arcata",
  universityRegion: "CA",
  guideId: "guide-id",
  guideDisplayName: "Maya Chen",
  guideMajor: "Public Health",
  guideDegree: "BS",
  guideEntryYear: 2024,
  guideBio: "Third-year student and campus tour lead.",
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
  avgRating: 4.5,
  reviewCount: 12,
  features: [],
  isNew: false,
};

describe("TourDetail", () => {
  it("renders fields supplied by the backend contract", () => {
    render(<TourDetail tour={tour} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(tour.title);
    expect(screen.getByText("Arcata, CA")).toBeInTheDocument();
    expect(screen.getByText("$42.00")).toBeInTheDocument();
    expect(screen.getByText("en-US · zh-CN")).toBeInTheDocument();
    expect(screen.getByText("4.5 from 12 reviews")).toBeInTheDocument();
    expect(screen.getByText("Maya Chen")).toBeInTheDocument();
  });

  it("does not invent optional API fields", () => {
    render(
      <TourDetail
        tour={{
          ...tour,
          description: null,
          languages: [],
          universityCity: null,
          universityRegion: null,
          guideBio: null,
          reviewCount: 0,
        }}
      />,
    );

    expect(
      screen.getByText(/ask the guide about this live campus experience/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Ask the guide")).toBeInTheDocument();
    expect(screen.getByText("New tour")).toBeInTheDocument();
    expect(screen.queryByText("Arcata, CA")).not.toBeInTheDocument();
  });
});
