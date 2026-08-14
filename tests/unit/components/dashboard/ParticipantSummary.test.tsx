import { render, screen } from "@testing-library/react";
import { ParticipantSummary } from "@/components/dashboard/ParticipantSummary";
import { useMe } from "@/lib/data-access";
import type { ParticipantDashboard } from "@/lib/data-access";

// Renders the real SectionHeading + MemberCard (no mocks except useMe and RecommendedTours).
// RecommendedTours is mocked out — it owns its own test file and requires a QueryClient.
// Note the component surfaces topics/universities as COUNTS ("N selected"), not joined lists,
// and the email only drives an "Email verified" pill (not the address).

jest.mock("@/components/dashboard/RecommendedTours", () => ({
  RecommendedTours: () => null,
}));

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useMe: jest.fn(),
}));

const mockUseMe = useMe as jest.Mock;

function makeData(
  overrides: Partial<ParticipantDashboard["participant"]> = {},
): ParticipantDashboard {
  return {
    kind: "participant",
    participant: {
      type: "STUDENT",
      topicsOfInterest: ["cs", "math", "physics"],
      universitiesOfInterest: ["mit", "stanford"],
      ...overrides,
    },
    createdAt: "2025-03-15T00:00:00Z",
  };
}

beforeEach(() => {
  mockUseMe.mockReturnValue({
    me: { user: { displayName: "Grace Hopper", email: "grace@example.com" } },
  });
});

describe("ParticipantSummary", () => {
  it("renders the participant display name in the heading and card", () => {
    render(<ParticipantSummary data={makeData()} />);
    expect(screen.getByText("Welcome back, Grace Hopper.")).toBeInTheDocument();
    // Also rendered as the MemberCard name.
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("renders the participant type", () => {
    render(<ParticipantSummary data={makeData({ type: "PARENT" })} />);
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("PARENT")).toBeInTheDocument();
  });

  it("shows the topics count as 'N selected'", () => {
    render(<ParticipantSummary data={makeData({ topicsOfInterest: ["a", "b", "c"] })} />);
    expect(screen.getByText("Topics")).toBeInTheDocument();
    expect(screen.getByText("3 selected")).toBeInTheDocument();
  });

  it("shows the universities count as 'N selected'", () => {
    render(<ParticipantSummary data={makeData({ universitiesOfInterest: ["x", "y"] })} />);
    expect(screen.getByText("Universities")).toBeInTheDocument();
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("falls back to — for empty topics and universities arrays", () => {
    render(
      <ParticipantSummary data={makeData({ topicsOfInterest: [], universitiesOfInterest: [] })} />,
    );
    // Both the Topics and Universities rows fall back to the em-dash.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to — for missing topics/universities/type fields", () => {
    const data = makeData();
    delete data.participant.topicsOfInterest;
    delete data.participant.universitiesOfInterest;
    delete data.participant.type;
    render(<ParticipantSummary data={data} />);
    // Type, Topics, Universities all fall back.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("shows the 'Email Verified' pill when email is present", () => {
    render(<ParticipantSummary data={makeData()} />);
    expect(screen.getByText("Email Verified")).toBeInTheDocument();
  });

  it("omits the 'Email verified' pill when email is missing", () => {
    mockUseMe.mockReturnValue({ me: { user: { displayName: "Grace Hopper", email: null } } });
    render(<ParticipantSummary data={makeData()} />);
    expect(screen.queryByText("Email Verified")).not.toBeInTheDocument();
  });

  it("renders the Guardian highlight for a PARENT participant", () => {
    render(<ParticipantSummary data={makeData({ type: "PARENT" })} />);
    expect(screen.getByText("Guardian consent active")).toBeInTheDocument();
    expect(screen.queryByText("Ready to explore")).not.toBeInTheDocument();
  });

  it("renders the explorer highlight for a non-PARENT participant", () => {
    render(<ParticipantSummary data={makeData({ type: "STUDENT" })} />);
    expect(screen.getByText("Ready to explore")).toBeInTheDocument();
    expect(screen.queryByText("Guardian consent active")).not.toBeInTheDocument();
  });

  it("renders a bare 'Welcome.' and 'Member' when displayName is missing", () => {
    mockUseMe.mockReturnValue({ me: { user: { displayName: null, email: null } } });
    const data = makeData();
    render(<ParticipantSummary data={data} />);
    expect(screen.getByText("Welcome back.")).toBeInTheDocument();
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("shows the account 'Member since' month and year", () => {
    // makeData seeds createdAt = 2025-03-15T00:00:00Z.
    render(<ParticipantSummary data={makeData()} />);
    expect(screen.getByText("Member since")).toBeInTheDocument();
    expect(screen.getByText("March 2025")).toBeInTheDocument();
  });
});
