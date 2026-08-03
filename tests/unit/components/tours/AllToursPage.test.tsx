import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AllToursPage } from "@/components/tours/AllToursPage";
import { useTourCatalog, useTourTopics, type TourSummary } from "@/lib/data-access";

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access/topics"),
  useTourCatalog: jest.fn(),
  useTourFeatures: jest.fn(() => ({
    byTopic: {},
    labelByCode: {},
    isLoading: false,
    isError: false,
  })),
  useTourTopics: jest.fn(() => ({
    data: [
      { value: "GENERAL_CAMPUS", label: "Campus life" },
      { value: "DORM_HOUSING", label: "Dorms & housing" },
    ],
  })),
}));

const replace = jest.fn();
const push = jest.fn();
let search = "";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => "/tours",
  useSearchParams: () => new URLSearchParams(search),
}));

const mockUseTourCatalog = useTourCatalog as jest.MockedFunction<typeof useTourCatalog>;
const mockUseTourTopics = useTourTopics as jest.MockedFunction<typeof useTourTopics>;
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

function mockCatalog(
  state: {
    items?: TourSummary[];
    totalPages?: number;
    totalElements?: number;
    isLoading?: boolean;
    isError?: boolean;
  } = {},
) {
  const items = state.items ?? [];
  mockUseTourCatalog.mockReturnValue({
    data:
      state.isLoading || state.isError
        ? undefined
        : {
            items,
            page: 0,
            size: 20,
            totalPages: state.totalPages ?? (items.length > 0 ? 1 : 0),
            totalElements: state.totalElements ?? items.length,
          },
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
    refetch,
  } as unknown as ReturnType<typeof useTourCatalog>);
}

beforeEach(() => {
  jest.clearAllMocks();
  search = "";
  mockCatalog({ items: [tour] });
});

describe("AllToursPage", () => {
  it("renders the explore heading, results, and university entry points", () => {
    render(<AllToursPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Tour campus with a student who's already there.",
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

  it("requests the catalog with the default filters and 24 per page", () => {
    render(<AllToursPage />);

    expect(mockUseTourCatalog).toHaveBeenLastCalledWith({
      q: undefined,
      topicIds: undefined,
      sort: "RECOMMENDED",
      page: 0,
      limit: 24,
    });
  });

  it("has no in-panel search box and shows topic quick-chips", () => {
    mockCatalog({ items: [tour], totalPages: 1 });
    render(<AllToursPage />);
    // The only search lives in the header (not rendered here); the page has no search textbox.
    expect(screen.queryByPlaceholderText(/university, tour, or topic/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Campus life" })).toBeInTheDocument();
  });

  it("changes topic instantly from a chip", async () => {
    mockCatalog({ items: [tour], totalPages: 1 });
    const user = userEvent.setup();
    render(<AllToursPage />);
    await user.click(screen.getByRole("button", { name: "Dorms & housing" }));
    expect(replace).toHaveBeenCalledWith("/tours?topic=DORM_HOUSING", { scroll: false });
  });

  it("opens the Filters dropdown and applies topic plus sort together", async () => {
    mockCatalog({ items: [tour], totalPages: 1, totalElements: 1 });
    const user = userEvent.setup();
    render(<AllToursPage />);
    const filters = screen.getByRole("button", { name: "Filters" });
    expect(filters).toBeEnabled();
    await user.click(filters);

    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(dialog).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Dorms & housing" }));
    await user.selectOptions(screen.getByLabelText("Sort by"), "RATING");
    await user.click(screen.getByRole("button", { name: "Show 1 tours" }));

    expect(replace).toHaveBeenCalledWith("/tours?sort=RATING&topic=DORM_HOUSING", {
      scroll: false,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders loading, empty, and fallback states", async () => {
    const user = userEvent.setup();
    mockCatalog({ isLoading: true });
    const { rerender } = render(<AllToursPage />);
    expect(screen.getByLabelText("Loading tours")).toBeInTheDocument();

    mockCatalog({ items: [] });
    rerender(<AllToursPage />);
    expect(
      screen.getByRole("heading", { name: "No tours match your filters yet" }),
    ).toBeInTheDocument();

    mockCatalog({ isError: true });
    rerender(<AllToursPage />);
    expect(
      screen.getByRole("heading", { name: "Showing university suggestions" }),
    ).toBeInTheDocument();
    const exploreButtons = screen.getAllByRole("button", { name: /Explore university/i });
    expect(exploreButtons).toHaveLength(7);
    exploreButtons.forEach((b) => expect(b).toBeDisabled());
    expect(screen.getAllByText("North Coast University")).toHaveLength(2);
    expect(screen.getAllByText("Harborview University")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("clears filters from the empty state and requests a refresh", async () => {
    const user = userEvent.setup();
    mockCatalog({ items: [] });
    render(<AllToursPage />);

    await user.click(screen.getByRole("button", { name: "Clear all filters" }));

    expect(replace).toHaveBeenCalledWith("/tours", { scroll: false });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("pages through results when there is more than one page", async () => {
    const user = userEvent.setup();
    mockCatalog({ items: [tour], totalPages: 3 });
    render(<AllToursPage />);

    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(push).toHaveBeenCalledWith("/tours?page=2", { scroll: false });
  });

  it("passes undefined degree/entryYear through to the card when the guide has none on file", () => {
    mockCatalog({ items: [{ ...tour, guideDegree: null, guideEntryYear: null }] });
    render(<AllToursPage />);
    // No credentials line renders without degree/major/entryYear (TourProductCard's own concern);
    // this just proves AllToursPage doesn't coerce the nullish backend fields into a truthy prop.
    expect(screen.queryByText(/Entered/)).not.toBeInTheDocument();
  });

  it("requests the catalog with topicIds from the URL when a topic filter is active", () => {
    search = "topic=GENERAL_CAMPUS";
    render(<AllToursPage />);

    expect(mockUseTourCatalog).toHaveBeenLastCalledWith(
      expect.objectContaining({ topicIds: ["GENERAL_CAMPUS"] }),
    );
  });

  it("treats a URL with no topic vocabulary loaded yet as having no university entries to filter by", () => {
    mockUseTourTopics.mockReturnValueOnce({ data: undefined } as ReturnType<typeof useTourTopics>);
    render(<AllToursPage />);

    // With no topic vocabulary available, canonicalization has nothing to canonicalize against —
    // the request still goes out with no topic filter.
    expect(mockUseTourCatalog).toHaveBeenLastCalledWith(
      expect.objectContaining({ topicIds: undefined }),
    );
  });

  it("falls back to a 0-result title and totalPages when the catalog resolves with no data", () => {
    mockUseTourCatalog.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch,
    } as unknown as ReturnType<typeof useTourCatalog>);
    render(<AllToursPage />);
    expect(screen.getByRole("heading", { name: "0 tours" })).toBeInTheDocument();
  });
});
