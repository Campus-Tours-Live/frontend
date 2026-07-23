import { render, screen } from "@testing-library/react";
import { FeaturedTours } from "@/components/home/FeaturedTours";
import { useTourCatalog, type TourSummary } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useTourCatalog: jest.fn(),
}));

const mockUseTourCatalog = useTourCatalog as jest.MockedFunction<typeof useTourCatalog>;

function tour(id: string, title: string): TourSummary {
  return {
    id,
    title,
    slug: id,
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
}

const NINE_TOURS: TourSummary[] = [
  tour("t1", "Campus life and hidden study spots"),
  tour("t2", "Engineering, labs, and student projects"),
  tour("t3", "International student experience"),
  tour("t4", "Dorm tour and housing options"),
  tour("t5", "Arts, studios, and performance spaces"),
  tour("t6", "Sports, gyms, and student rec"),
  tour("t7", "Libraries and quiet study corners"),
  tour("t8", "Dining halls and campus food scene"),
  tour("t9", "Research labs and grad pathways"),
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseTourCatalog.mockReturnValue({
    data: { items: NINE_TOURS, page: 0, size: 20, totalPages: 1, totalElements: NINE_TOURS.length },
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useTourCatalog>);
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
    expect(screen.getAllByRole("button", { name: /view tour/i })).toHaveLength(9);
  });

  it("renders carousel navigation arrows", () => {
    render(<FeaturedTours />);
    expect(screen.getByRole("button", { name: /previous tours/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next tours/i })).toBeInTheDocument();
  });

  it("links the view-all CTAs to the tours catalog", () => {
    render(<FeaturedTours />);

    expect(screen.getAllByRole("link", { name: /view all tours/i })).toEqual(
      expect.arrayContaining([expect.objectContaining({ pathname: "/tours" })]),
    );
  });
});
