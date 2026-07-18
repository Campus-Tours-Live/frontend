import { render, screen } from "@testing-library/react";
import { TourCatalogCard } from "@/components/tours/TourCatalogCard";
import type { TourSummary } from "@/lib/data-access";

const tour: TourSummary = {
  id: "tour-1",
  title: "Campus life and hidden study spots",
  slug: "campus-life",
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
  features: [],
  isNew: false,
};

function renderCard(overrides: Partial<TourSummary> = {}) {
  return render(<TourCatalogCard tour={{ ...tour, ...overrides }} topicLabel="Campus life" />);
}

describe("TourCatalogCard", () => {
  it("renders the catalog tour summary", () => {
    renderCard();

    expect(
      screen.getByRole("heading", { name: "Campus life and hidden study spots" }),
    ).toBeInTheDocument();
    expect(screen.getByText("North Coast University")).toBeInTheDocument();
    expect(screen.getByText("Hosted by Maya Chen")).toBeInTheDocument();
    expect(screen.getByText("60 min")).toBeInTheDocument();
    expect(screen.getByText("4.8 (18)")).toBeInTheDocument();
    expect(screen.getByText("$42")).toBeInTheDocument();
  });

  it("links to the tour detail route by slug", () => {
    renderCard();

    expect(screen.getByRole("link", { name: "View tour" })).toHaveAttribute(
      "href",
      "/tours/campus-life",
    );
  });

  it("keeps cents when the price is not a whole dollar", () => {
    renderCard({ priceCents: 4250 });

    expect(screen.getByText("$42.50")).toBeInTheDocument();
  });
});
