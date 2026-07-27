import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TourOfferingsPage } from "@/components/offerings/TourOfferingsPage";
import { useGuideProfile, useOfferings, useTourTopics } from "@/lib/data-access";
import type { GuideProfile, Offering } from "@/lib/data-access";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("@/lib/data-access", () => ({
  useGuideProfile: jest.fn(),
  useOfferings: jest.fn(),
  useTourTopics: jest.fn(),
  useActivateOffering: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

const mockUseGuideProfile = useGuideProfile as jest.Mock;
const mockUseOfferings = useOfferings as jest.Mock;
const mockUseTourTopics = useTourTopics as jest.Mock;

const sampleOffering: Offering = {
  id: "o1",
  title: "Campus walk",
  slug: "campus-walk",
  status: "DRAFT",
  topic: "GENERAL_CAMPUS",
  universityId: "uni-1",
  durationMin: 60,
  priceCents: 4200,
  currency: "USD",
  description: "A scenic route",
};

function makeGuideProfile(overrides: Partial<GuideProfile> = {}): GuideProfile {
  return {
    applicationStatus: "VERIFIED",
    ...overrides,
  };
}

function setHooks(
  overrides: {
    guideProfile?: Partial<ReturnType<typeof useGuideProfile>>;
    offerings?: Partial<ReturnType<typeof useOfferings>>;
    topics?: Partial<ReturnType<typeof useTourTopics>>;
  } = {},
) {
  mockUseGuideProfile.mockReturnValue({
    data: makeGuideProfile(),
    isLoading: false,
    isError: false,
    ...overrides.guideProfile,
  });
  mockUseOfferings.mockReturnValue({
    data: [sampleOffering],
    isLoading: false,
    isError: false,
    ...overrides.offerings,
  });
  mockUseTourTopics.mockReturnValue({
    data: [{ value: "GENERAL_CAMPUS", label: "General campus" }],
    ...overrides.topics,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setHooks();
});

describe("TourOfferingsPage", () => {
  it("renders a loading state while offerings are loading", () => {
    setHooks({ offerings: { data: undefined, isLoading: true, isError: false } });
    render(<TourOfferingsPage />);

    expect(screen.getByText(/loading offerings/i)).toBeInTheDocument();
  });

  it("renders an error alert when offerings fail to load", () => {
    setHooks({ offerings: { data: undefined, isLoading: false, isError: true } });
    render(<TourOfferingsPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load your tour offerings.");
  });

  it("shows an empty-state message when there are no offerings", () => {
    setHooks({ offerings: { data: [], isLoading: false, isError: false } });
    render(<TourOfferingsPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "You have no tour offerings yet. Create one to get started.",
    );
  });

  it("shows a filter empty-state when no offerings match the filter", async () => {
    const user = userEvent.setup();
    setHooks({
      offerings: {
        data: [{ ...sampleOffering, status: "ACTIVE" }],
        isLoading: false,
        isError: false,
      },
    });
    render(<TourOfferingsPage />);

    await user.click(screen.getByRole("button", { name: "Draft" }));

    expect(screen.getByRole("alert")).toHaveTextContent("No offerings match this filter.");
  });

  it("renders offering cards with resolved topic labels", () => {
    render(<TourOfferingsPage />);

    expect(screen.getByRole("heading", { name: "Campus walk" })).toBeInTheDocument();
    expect(screen.getByText("General campus")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create tour offering" })).toHaveAttribute(
      "href",
      "/guide/tour-offerings/new",
    );
  });

  it("renders raw offering topic when the topics list hasn't loaded", () => {
    setHooks({ topics: { data: undefined } });
    render(<TourOfferingsPage />);

    expect(screen.getByText("GENERAL_CAMPUS")).toBeInTheDocument();
  });

  it("passes no topic label when the offering has no topic", () => {
    setHooks({
      offerings: { data: [{ ...sampleOffering, topic: null }], isLoading: false, isError: false },
    });
    render(<TourOfferingsPage />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("enables publish when the guide profile's applicationStatus is VERIFIED", () => {
    render(<TourOfferingsPage />);

    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
  });

  it("disables publish when the guide profile's applicationStatus is not VERIFIED", () => {
    setHooks({ guideProfile: { data: makeGuideProfile({ applicationStatus: "PENDING" }) } });
    render(<TourOfferingsPage />);

    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });
});
