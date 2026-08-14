import { render, screen } from "@testing-library/react";
import { RecommendedTours } from "@/components/dashboard/RecommendedTours";
import { useTourCatalog, type TourSummary } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useTourCatalog: jest.fn(),
}));

const mockUseTourCatalog = useTourCatalog as jest.MockedFunction<typeof useTourCatalog>;

const baseTour: TourSummary = {
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

function mockCatalog({
  items = [],
  isLoading = false,
  isError = false,
}: {
  items?: TourSummary[];
  isLoading?: boolean;
  isError?: boolean;
} = {}) {
  mockUseTourCatalog.mockReturnValue({
    data:
      isLoading || isError
        ? undefined
        : {
            items,
            page: 0,
            size: 4,
            totalPages: items.length > 0 ? 1 : 0,
            totalElements: items.length,
          },
    isLoading,
    isError,
  } as ReturnType<typeof useTourCatalog>);
}

describe("RecommendedTours", () => {
  it("renders nothing when the catalog returns an error", () => {
    mockCatalog({ isError: true });
    const { container } = render(<RecommendedTours />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the catalog is empty", () => {
    mockCatalog({ items: [] });
    const { container } = render(<RecommendedTours />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the section heading and skeleton placeholders while loading", () => {
    mockCatalog({ isLoading: true });
    render(<RecommendedTours />);
    expect(screen.getByText("Keep exploring")).toBeInTheDocument();
    // Skeletons replace tour cards — no 'View tour' buttons during loading.
    expect(screen.queryByText("View tour")).not.toBeInTheDocument();
  });

  it("renders the 'See all tours' link pointing to /tours", () => {
    mockCatalog({ items: [baseTour] });
    render(<RecommendedTours />);
    const link = screen.getByRole("link", { name: "See all tours" });
    expect(link).toHaveAttribute("href", "/tours");
  });

  it("renders a card for each tour returned by the catalog", () => {
    const second: TourSummary = {
      ...baseTour,
      id: "tour-2",
      title: "Engineering quad tour",
      universityName: "Redwood State College",
      guideDisplayName: "Elias Brooks",
      durationMin: 45,
      priceCents: 3600,
    };
    mockCatalog({ items: [baseTour, second] });
    render(<RecommendedTours />);
    expect(screen.getByText("Campus life and hidden study spots")).toBeInTheDocument();
    expect(screen.getByText("Engineering quad tour")).toBeInTheDocument();
  });

  it("converts priceCents to whole dollars on the card", () => {
    mockCatalog({ items: [{ ...baseTour, priceCents: 4200 }] });
    render(<RecommendedTours />);
    expect(screen.getByText("$42")).toBeInTheDocument();
  });

  it("passes university name, guide name, and duration to the card", () => {
    mockCatalog({ items: [baseTour] });
    render(<RecommendedTours />);
    // TourCard renders these as "university · guide · N min"
    expect(screen.getByText("North Coast University · Maya Chen · 60 min")).toBeInTheDocument();
  });

  it("requests the catalog with limit 4 and RECOMMENDED sort", () => {
    mockCatalog({ items: [baseTour] });
    render(<RecommendedTours />);
    expect(mockUseTourCatalog).toHaveBeenCalledWith({ limit: 4, sort: "RECOMMENDED" });
  });
});
