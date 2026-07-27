import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/(app)/dashboard/page";
import { useDashboard, useMe } from "@/lib/data-access";
import type { GuideDashboard, ParticipantDashboard } from "@/lib/data-access";

// The page is a thin role-router over the useDashboard() hook; mock the hook so we
// can drive each branch (loading / error / no-data / guide / participant). We let
// the real GuideSummary / ParticipantSummary (and MemberCard / Alert) render. Identity
// (display name / email) now comes from useMe(), not the role-shaped aggregate.
jest.mock("@/lib/data-access", () => ({
  useDashboard: jest.fn(),
  useMe: jest.fn(),
}));

const mockUseDashboard = useDashboard as jest.Mock;
const mockUseMe = useMe as jest.Mock;

const guideData: GuideDashboard = {
  kind: "guide",
  guide: {
    universities: [
      {
        universityId: "uni-1",
        universityName: "State University",
        universityShortName: null,
        major: "Computer Science",
        verificationStatus: "VERIFIED",
      },
    ],
    applicationStatus: "VERIFIED",
  },
  guideStatus: "VERIFIED",
  canPublish: true,
  offerings: [
    {
      id: "o1",
      title: "Campus walk",
      slug: "campus-walk",
      status: "ACTIVE",
      topic: "general",
      universityId: null,
      durationMin: 45,
      priceCents: 1000,
      currency: "USD",
    },
  ],
  createdAt: "2025-03-15T00:00:00Z",
};

const participantData: ParticipantDashboard = {
  kind: "participant",
  participant: {
    type: "STUDENT",
    topicsOfInterest: ["cs", "math"],
    universitiesOfInterest: ["mit"],
  },
  createdAt: "2025-03-15T00:00:00Z",
};

function setHook(overrides: Partial<ReturnType<typeof useDashboard>>) {
  mockUseDashboard.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  } as ReturnType<typeof useDashboard>);
}

beforeEach(() => {
  // Identity is read off useMe() by the summaries now; a display name is set per-branch below.
  mockUseMe.mockReturnValue({ me: { user: { displayName: null } } });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("DashboardPage", () => {
  it("renders a loading message while isLoading is true", () => {
    setHook({ isLoading: true });
    render(<DashboardPage />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    // No error alert and no summary cards while loading.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders an error alert when isError is true", () => {
    setHook({ isError: true });
    render(<DashboardPage />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Failed to load your dashboard");
  });

  it("renders an error alert when data is undefined (not loading, not error)", () => {
    setHook({ data: undefined });
    render(<DashboardPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load your dashboard");
  });

  it("renders an error alert when data is null", () => {
    setHook({ data: null as unknown as undefined });
    render(<DashboardPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load your dashboard");
  });

  it("renders the guide summary branch when data.kind is 'guide'", () => {
    setHook({ data: guideData });
    mockUseMe.mockReturnValue({ me: { user: { displayName: "Ada Lovelace" } } });
    render(<DashboardPage />);

    // Guide-specific signals: the guide's name + the guide role pill.
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Student Guide")).toBeInTheDocument();
    // Offerings row (guide-only) reflects offerings.length.
    expect(screen.getByText("Offerings")).toBeInTheDocument();

    // It should NOT render the participant welcome heading.
    expect(screen.queryByText(/Your participant profile is saved\./)).not.toBeInTheDocument();
  });

  it("renders the participant summary branch when data.kind is 'participant'", () => {
    setHook({ data: participantData });
    mockUseMe.mockReturnValue({ me: { user: { displayName: "Grace Hopper" } } });
    render(<DashboardPage />);

    // Participant-specific signals: the welcome heading + lead copy.
    expect(screen.getByText("Welcome, Grace Hopper.")).toBeInTheDocument();
    expect(screen.getByText("Your participant profile is saved.")).toBeInTheDocument();

    // It should NOT render the guide-only offerings row.
    expect(screen.queryByText("Offerings")).not.toBeInTheDocument();
  });
});
