import { render, screen } from "@testing-library/react";
import { GuideSummary } from "@/components/dashboard/GuideSummary";
import type { GuideDashboard, Offering } from "@/lib/data-access";

// GuideSummary renders two sections (top to bottom):
//   1. MemberCard — avatar + role pill, label→value rows, highlight callout.
//   2. Stats row — Profile completion, Rating, This month, Upcoming payout.
// Profile completion % is computed locally from guide profile fields; the other
// three stats show "—" until BFF endpoints land.

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
      displayName: "Ada Lovelace",
      email: "ada@example.com",
      major: "Computer Science",
      applicationStatus: "APPROVED",
    },
    guideStatus: "APPROVED",
    canPublish: true,
    offerings: [offering("1"), offering("2")],
    createdAt: "2025-03-15T00:00:00Z",
    ...overrides,
  };
}

/** All 8 completion checks satisfied → 100%. */
function fullGuide(): GuideDashboard["guide"] {
  return {
    firstName: "Ada",
    lastName: "Lovelace",
    displayName: "Ada Lovelace",
    bio: "Campus expert",
    languages: ["English"],
    specialties: ["STEM"],
    basePriceCents: 5000,
    verificationStatus: "VERIFIED",
    applicationStatus: "APPROVED",
  };
}

// ---------------------------------------------------------------------------
// MemberCard
// ---------------------------------------------------------------------------
describe("GuideSummary — MemberCard", () => {
  it("renders the guide display name", () => {
    render(<GuideSummary data={makeData()} />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("shows the application status from guideStatus", () => {
    render(<GuideSummary data={makeData({ guideStatus: "PENDING" })} />);
    expect(screen.getByText("Application")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  it("falls back to — when guideStatus is null", () => {
    render(<GuideSummary data={makeData({ guideStatus: null })} />);
    expect(screen.getByText("Application")).toBeInTheDocument();
  });

  it("shows the offerings count", () => {
    render(
      <GuideSummary
        data={makeData({ offerings: [offering("a"), offering("b"), offering("c")] })}
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
    delete data.guide.major;
    render(<GuideSummary data={data} />);
    expect(screen.getByText("Major")).toBeInTheDocument();
    expect(screen.queryByText("Computer Science")).not.toBeInTheDocument();
  });

  it("shows the under-review highlight when canPublish is false", () => {
    render(<GuideSummary data={makeData({ canPublish: false })} />);
    expect(screen.getByText("Application under review")).toBeInTheDocument();
    expect(screen.getByText("Hosting unlocks once an admin approves you.")).toBeInTheDocument();
    expect(screen.getByText("Student Guide")).toBeInTheDocument();
  });

  it("shows the approved-to-host highlight when canPublish is true", () => {
    render(<GuideSummary data={makeData({ canPublish: true })} />);
    expect(screen.queryByText("Application under review")).not.toBeInTheDocument();
    expect(screen.getByText("Approved to host")).toBeInTheDocument();
    expect(screen.getByText("Student Guide")).toBeInTheDocument();
  });

  it("falls back to 'Member' when displayName is missing", () => {
    const data = makeData();
    delete data.guide.displayName;
    render(<GuideSummary data={data} />);
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("shows the account 'Member since' month and year", () => {
    render(<GuideSummary data={makeData()} />);
    expect(screen.getByText("Member since")).toBeInTheDocument();
    expect(screen.getByText("March 2025")).toBeInTheDocument();
  });

  it("does not surface the guide's email address", () => {
    render(<GuideSummary data={makeData()} />);
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText(/Email Verified/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------
describe("GuideSummary — stats row", () => {
  it("renders all four stat card eyebrows", () => {
    render(<GuideSummary data={makeData()} />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Rating")).toBeInTheDocument();
    expect(screen.getByText("This month")).toBeInTheDocument();
    expect(screen.getByText("Upcoming payout")).toBeInTheDocument();
  });

  it("shows — for rating, this month, and upcoming payout (BFF not yet wired)", () => {
    render(<GuideSummary data={makeData()} />);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("shows placeholder subtitles for the three BFF stats", () => {
    render(<GuideSummary data={makeData()} />);
    expect(screen.getByText("No reviews yet")).toBeInTheDocument();
    expect(screen.getByText("Earnings snapshot")).toBeInTheDocument();
    expect(screen.getByText("Captured earnings")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Profile completion card
// ---------------------------------------------------------------------------
describe("GuideSummary — profile completion", () => {
  it("shows 0% when no guide fields are filled", () => {
    render(<GuideSummary data={makeData({ guide: {} })} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("shows 100% when all guide fields are filled", () => {
    render(<GuideSummary data={makeData({ guide: fullGuide() })} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("computes partial completion correctly (4 of 8 fields → 50%)", () => {
    render(
      <GuideSummary
        data={makeData({
          guide: {
            firstName: "Ada",
            lastName: "Lovelace",
            bio: "Campus expert",
            applicationStatus: "APPROVED",
            // languages, specialties, basePriceCents, verificationStatus absent
          },
        })}
      />,
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders a progressbar with correct aria attributes", () => {
    render(<GuideSummary data={makeData({ guide: fullGuide() })} />);
    const bar = screen.getByRole("progressbar", { name: /profile completion/i });
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("always shows the 'Complete profile' link pointing to /profile", () => {
    render(<GuideSummary data={makeData({ guide: {} })} />);
    const link = screen.getByRole("link", { name: /complete profile/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/profile");
  });

  it("still shows 'Complete profile' link even when profile is 100% complete", () => {
    render(<GuideSummary data={makeData({ guide: fullGuide() })} />);
    expect(screen.getByRole("link", { name: /complete profile/i })).toBeInTheDocument();
  });
});
