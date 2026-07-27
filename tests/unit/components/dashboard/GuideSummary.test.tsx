import { render, screen } from "@testing-library/react";
import { GuideSummary } from "@/components/dashboard/GuideSummary";
import { useMe } from "@/lib/data-access";
import type { GuideDashboard, Offering } from "@/lib/data-access";

// Renders the real MemberCard + Alert (no mocks, except useMe — identity now comes from
// there, not the dashboard aggregate). GuideSummary is purely presentational: name + role
// pill, label→value rows (Major / Application / Offerings) and a highlight callout gated
// on canPublish.

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useMe: jest.fn(),
}));

const mockUseMe = useMe as jest.Mock;

function offering(id: string): Offering {
  return {
    id,
    title: `Tour ${id}`,
    slug: `tour-${id}`,
    status: "ACTIVE",
    topic: "general",
    universityId: null,
    durationMin: 30,
    priceCents: 1000,
    currency: "USD",
  };
}

function makeData(overrides: Partial<GuideDashboard> = {}): GuideDashboard {
  return {
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
    offerings: [offering("1"), offering("2")],
    createdAt: "2025-03-15T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  mockUseMe.mockReturnValue({
    me: { user: { displayName: "Ada Lovelace", email: "ada@example.com" } },
  });
});

describe("GuideSummary", () => {
  it("renders the guide display name from useMe", () => {
    render(<GuideSummary data={makeData()} />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("shows the friendly application status label for guideStatus", () => {
    render(<GuideSummary data={makeData({ guideStatus: "PENDING" })} />);
    expect(screen.getByText("Application")).toBeInTheDocument();
    expect(screen.getByText("Pending verification")).toBeInTheDocument();
  });

  it("passes an unknown guideStatus through as-is", () => {
    render(<GuideSummary data={makeData({ guideStatus: "SOMETHING_ELSE" })} />);
    expect(screen.getByText("SOMETHING_ELSE")).toBeInTheDocument();
  });

  it("falls back to — when guideStatus is null", () => {
    render(<GuideSummary data={makeData({ guideStatus: null })} />);
    expect(screen.getByText("Application")).toBeInTheDocument();
    // The Application row value should render the em-dash fallback.
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the offerings count (offerings.length)", () => {
    render(
      <GuideSummary
        data={makeData({
          offerings: [offering("a"), offering("b"), offering("c")],
        })}
      />,
    );
    expect(screen.getByText("Offerings")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows 0 when there are no offerings", () => {
    render(<GuideSummary data={makeData({ offerings: [] })} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows the major when present", () => {
    render(<GuideSummary data={makeData()} />);
    expect(screen.getByText("Major")).toBeInTheDocument();
    expect(screen.getByText("Computer Science")).toBeInTheDocument();
  });

  it("falls back to — for the major when absent", () => {
    const data = makeData();
    delete data.guide.universities![0]!.major;
    render(<GuideSummary data={data} />);
    expect(screen.getByText("Major")).toBeInTheDocument();
    expect(screen.queryByText("Computer Science")).not.toBeInTheDocument();
    // The Major row value should fall back to the em-dash.
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("falls back to — for the major when the guide has no universities at all", () => {
    render(<GuideSummary data={makeData({ guide: { universities: [] } })} />);
    expect(screen.getByText("Major")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the under-review highlight when canPublish is false", () => {
    render(<GuideSummary data={makeData({ canPublish: false })} />);
    expect(screen.getByText("Application under review")).toBeInTheDocument();
    expect(screen.getByText("Hosting unlocks once an admin approves you.")).toBeInTheDocument();
    // Unverified guides get the plain "Student Guide" role label.
    expect(screen.getByText("Student Guide")).toBeInTheDocument();
  });

  it("does NOT show the under-review highlight when canPublish is true", () => {
    render(<GuideSummary data={makeData({ canPublish: true })} />);
    expect(screen.queryByText("Application under review")).not.toBeInTheDocument();
    // Instead it shows the approved-to-host highlight.
    expect(screen.getByText("Approved to host")).toBeInTheDocument();
    // Role pill is always "Student Guide"; "verified" is conveyed by the green pill.
    expect(screen.getByText("Student Guide")).toBeInTheDocument();
  });

  it("falls back to 'Member' when displayName is missing", () => {
    mockUseMe.mockReturnValue({ me: { user: { displayName: null } } });
    render(<GuideSummary data={makeData()} />);
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("does NOT render the guide's email anywhere", () => {
    // Documents current behavior: GuideSummary never surfaces the account email.
    render(<GuideSummary data={makeData()} />);
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText(/Email Verified/)).not.toBeInTheDocument();
  });

  it("shows the account 'Member since' month and year", () => {
    // makeData seeds createdAt = 2025-03-15T00:00:00Z.
    render(<GuideSummary data={makeData()} />);
    expect(screen.getByText("Member since")).toBeInTheDocument();
    expect(screen.getByText("March 2025")).toBeInTheDocument();
  });
});
