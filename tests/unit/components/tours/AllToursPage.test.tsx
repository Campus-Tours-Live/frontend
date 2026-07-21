import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AllToursPage } from "@/components/tours/AllToursPage";
import { useTourCatalog, type TourSummary } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  useTourCatalog: jest.fn(),
}));

const mockUseTourCatalog = useTourCatalog as jest.MockedFunction<typeof useTourCatalog>;
const refetch = jest.fn();

const tour: TourSummary = {
  id: "tour-1",
  title: "Campus life and hidden study spots",
  slug: "campus-life",
  topic: "GENERAL_CAMPUS",
  universityId: "u1",
  universityName: "North Coast University",
  guideId: "g1",
  guideDisplayName: "Maya Chen",
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
  avgRating: 4.8,
  reviewCount: 18,
};

function mockCatalog(state: Partial<ReturnType<typeof useTourCatalog>>) {
  mockUseTourCatalog.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch,
    ...state,
  } as ReturnType<typeof useTourCatalog>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCatalog({ data: [tour] });
});

describe("AllToursPage", () => {
  it("renders the explore heading, results, and university entry points", () => {
    render(<AllToursPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Find a campus experience that matches what matters to you.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "1 tours" })).toBeInTheDocument();
    expect(screen.getByText("Campus life and hidden study spots")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Browse by university" })).toBeInTheDocument();
    expect(screen.getByText("Blue Ridge Institute")).toBeInTheDocument();
  });

  it("does not duplicate the homepage recommended tours module", () => {
    render(<AllToursPage />);

    expect(screen.queryByText(/tours students are exploring now/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /start with a campus that feels right/i }),
    ).not.toBeInTheDocument();
  });

  it("passes search, topic, and sort filters to the catalog hook", async () => {
    const user = userEvent.setup();
    render(<AllToursPage />);

    await user.type(screen.getByPlaceholderText("University, tour, or topic"), "housing");
    await user.click(screen.getByRole("button", { name: "Dorms & housing" }));
    await user.selectOptions(screen.getByLabelText("Sort by"), "RATING");

    expect(mockUseTourCatalog).toHaveBeenLastCalledWith({
      q: "housing",
      topic: "DORM_HOUSING",
      sort: "RATING",
      limit: 20,
    });
  });

  it("renders loading, empty, and fallback states", async () => {
    const user = userEvent.setup();
    mockCatalog({ isLoading: true, data: undefined });
    const { rerender } = render(<AllToursPage />);
    expect(screen.getByLabelText("Loading tours")).toBeInTheDocument();

    mockCatalog({ data: [] });
    rerender(<AllToursPage />);
    expect(
      screen.getByRole("heading", { name: "No tours match these filters" }),
    ).toBeInTheDocument();

    mockCatalog({ isError: true, data: [] });
    rerender(<AllToursPage />);
    expect(
      screen.getByRole("heading", { name: "Showing university suggestions" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Explore university/i })).toHaveLength(7);
    expect(screen.getAllByText("North Coast University")).toHaveLength(2);
    expect(screen.getAllByText("Harborview University")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("clears filters and requests a refresh", async () => {
    const user = userEvent.setup();
    render(<AllToursPage />);

    await user.type(screen.getByPlaceholderText("University, tour, or topic"), "ucla");
    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(screen.getByPlaceholderText("University, tour, or topic")).toHaveValue("");
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
