import { render, screen } from "@testing-library/react";
import { TourDetailPage } from "@/components/tours/TourDetailPage";
import { useTourDetail } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({ useTourDetail: jest.fn() }));
const mockUseTourDetail = useTourDetail as jest.Mock;

const tour = {
  id: "t1",
  title: "Campus walk",
  slug: "campus-walk",
  topic: "GENERAL_CAMPUS",
  universityId: "u1",
  universityName: "North Coast University",
  guideId: "g1",
  guideDisplayName: "Maya Chen",
  guideMajor: "Computer Science",
  guideDegree: "BS",
  guideEntryYear: 2023,
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
  avgRating: 4.8,
  reviewCount: 18,
  languages: ["en-US"],
  features: ["Q_AND_A"],
  isNew: false,
  description: "See the quad.",
  universitySlug: "north-coast",
  universityCity: "Arcata",
  universityRegion: "CA",
  guideBio: "Campus ambassador.",
};

describe("TourDetailPage", () => {
  it("renders public offering information", () => {
    mockUseTourDetail.mockReturnValue({ data: tour, isLoading: false, isError: false });
    render(<TourDetailPage tourId="t1" />);
    expect(screen.getByRole("heading", { name: "Campus walk" })).toBeInTheDocument();
    expect(screen.getByText("See the quad.")).toBeInTheDocument();
    expect(screen.getByText("Hosted by Maya Chen")).toBeInTheDocument();
  });

  it("shows an unavailable message for a failed lookup", () => {
    mockUseTourDetail.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<TourDetailPage tourId="missing" />);
    expect(screen.getByRole("alert")).toHaveTextContent("This tour is no longer available.");
  });
});
