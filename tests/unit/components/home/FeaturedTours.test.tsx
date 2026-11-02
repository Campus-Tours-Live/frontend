import { render, screen } from "@testing-library/react";

const tours = Array.from({ length: 9 }, (_, index) => ({
  id: `00000000-0000-4000-8000-00000000000${index}`,
  title:
    index === 0
      ? "Campus life and hidden study spots"
      : index === 8
        ? "Research labs and grad pathways"
        : `Tour ${index + 1}`,
  slug: `tour-${index + 1}`,
  topic: "GENERAL_CAMPUS",
  universityId: "university-id",
  universityName: "Test University",
  guideId: "guide-id",
  guideDisplayName: "Jane Doe",
  guideMajor: "Computer Science",
  guideDegree: "BS",
  guideEntryYear: 2024,
  durationMin: 30,
  priceCents: 2500,
  currency: "USD",
  avgRating: 4.5,
  reviewCount: 10,
  languages: ["en-US"],
  features: [],
  isNew: false,
}));

const catalogPage = {
  items: tours,
  page: 0,
  size: 20,
  totalElements: tours.length,
  totalPages: 1,
};

const mockUseTourCatalog = jest.fn();
jest.mock("@/lib/data-access", () => ({
  ApiError: class ApiError extends Error {
    constructor(public status: number) {
      super(`HTTP ${status}`);
    }
  },
  useTourCatalog: () => mockUseTourCatalog(),
}));
import { FeaturedTours } from "@/components/home/FeaturedTours";
import { TourCard } from "@/components/tours/TourCard";
import { ApiError } from "@/lib/data-access";

beforeEach(() => {
  mockUseTourCatalog.mockReturnValue({ data: catalogPage, isLoading: false, error: null });
});

describe("FeaturedTours", () => {
  it("renders the section heading", () => {
    render(<FeaturedTours />);
    expect(
      screen.getByRole("heading", { level: 2, name: /start with a campus that feels right/i }),
    ).toBeInTheDocument();
  });

  it("renders all nine featured tour cards in the carousel", () => {
    render(<FeaturedTours />);
    expect(screen.getByText(/campus life and hidden study spots/i)).toBeInTheDocument();
    expect(screen.getByText(/research labs and grad pathways/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^view (?!all tours)/i })).toHaveLength(9);
  });

  it("renders carousel navigation arrows", () => {
    render(<FeaturedTours />);
    expect(screen.getByRole("button", { name: /previous tours/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next tours/i })).toBeInTheDocument();
  });

  it("links the view-all CTAs to the tours catalog", () => {
    render(<FeaturedTours />);

    for (const link of screen.getAllByRole("link", { name: /view all tours/i })) {
      expect(link).toHaveAttribute("href", "/tours");
    }
  });

  it("shows loading, signed-out, and empty catalog states", () => {
    mockUseTourCatalog.mockReturnValueOnce({ data: undefined, isLoading: true, error: null });
    const { rerender } = render(<FeaturedTours />);
    expect(screen.getByText(/loading tours/i)).toBeInTheDocument();

    mockUseTourCatalog.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new ApiError(401),
    });
    rerender(<FeaturedTours />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signin");

    mockUseTourCatalog.mockReturnValueOnce({
      data: { ...catalogPage, items: [], totalElements: 0, totalPages: 0 },
      isLoading: false,
      error: null,
    });
    rerender(<FeaturedTours />);
    expect(screen.getByText(/no live tours are available/i)).toBeInTheDocument();
  });
});

describe("TourCard", () => {
  it("renders price, guide meta and a verified badge", () => {
    render(
      <TourCard
        id="test-tour"
        title="Test tour"
        university="Test University"
        guide="Jane Doe"
        durationMinutes={30}
        priceCents={2500}
        currency="USD"
        avgRating={4.5}
        reviewCount={10}
      />,
    );
    expect(screen.getByRole("heading", { level: 4, name: /test tour/i })).toBeInTheDocument();
    expect(screen.getByText(/Test University · Jane Doe · 30 min/i)).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
    expect(screen.getByText(/verified guide/i)).toBeInTheDocument();
  });
});
