import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AllToursPage } from "@/components/tours/AllToursPage";
import { useTourCatalog, type TourSummary } from "@/lib/data-access";

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

describe("AllToursPage filters dropdown wiring", () => {
  it("opens the filters dropdown, applies a sort choice, and closes it", async () => {
    const user = userEvent.setup();
    render(<AllToursPage />);
    const trigger = screen.getByRole("button", { name: "Filters" });
    expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.selectOptions(screen.getByLabelText("Sort by"), "RATING");
    await user.click(screen.getByRole("button", { name: "Show 1 tours" }));

    expect(replace).toHaveBeenCalledWith("/tours?sort=RATING", { scroll: false });
    expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument();
  });

  it("closes the filters dropdown with Escape without applying a sort change", async () => {
    const user = userEvent.setup();
    render(<AllToursPage />);

    await user.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
