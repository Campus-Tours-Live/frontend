import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AllToursPage } from "@/components/tours/AllToursPage";
import { useTourCatalog, type TourSummary } from "@/lib/data-access";

// Same mock shape as AllToursPage.test.tsx.
jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access/topics"),
  useTourCatalog: jest.fn(),
  useTourFeatures: jest.fn(() => ({
    byTopic: {},
    labelByCode: {},
    isLoading: false,
    isError: false,
  })),
  useTourTopics: () => ({
    data: [
      { value: "GENERAL_CAMPUS", label: "Campus life" },
      { value: "DORM_HOUSING", label: "Dorms & housing" },
    ],
  }),
}));

const replace = jest.fn();
const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => "/tours",
  useSearchParams: () => new URLSearchParams(""),
}));

// The real TourFiltersBar's "Filters" button is `disabled` ("Coming soon"), so it can't be used to
// drive AllToursPage's open/close/apply wiring for TourFiltersModal (setModalOpen(true)/onClose/
// onApply — lines that render the modal) from a real click in this suite yet. Stub just the
// trigger so this file can exercise that wiring for when the button ships enabled; the modal
// itself (TourFiltersModal) is NOT mocked — it renders and behaves for real once opened.
jest.mock("@/components/tours/TourFiltersBar", () => ({
  TourFiltersBar: ({ onOpenFilters }: { onOpenFilters: () => void }) => (
    <button type="button" onClick={onOpenFilters}>
      open-filters-test-hook
    </button>
  ),
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
  state: { items?: TourSummary[]; totalPages?: number; totalElements?: number } = {},
) {
  const items = state.items ?? [tour];
  mockUseTourCatalog.mockReturnValue({
    data: {
      items,
      page: 0,
      size: 20,
      totalPages: state.totalPages ?? 1,
      totalElements: state.totalElements ?? items.length,
    },
    isLoading: false,
    isError: false,
    refetch,
  } as unknown as ReturnType<typeof useTourCatalog>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCatalog({ totalElements: 1 });
});

describe("AllToursPage — filters modal wiring", () => {
  it("opens the filters modal from the trigger, applies a sort choice, and closes it", async () => {
    const user = userEvent.setup();
    render(<AllToursPage />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "open-filters-test-hook" }));
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Sort by"), "RATING");
    await user.click(screen.getByRole("button", { name: "Show 1 tours" }));

    expect(replace).toHaveBeenCalledWith("/tours?sort=RATING", { scroll: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the filters modal via its Close control without applying a sort change", async () => {
    const user = userEvent.setup();
    render(<AllToursPage />);

    await user.click(screen.getByRole("button", { name: "open-filters-test-hook" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
