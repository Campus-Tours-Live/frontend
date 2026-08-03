import { render, screen } from "@testing-library/react";
import { ParticipantSummary } from "@/components/dashboard/ParticipantSummary";
import { useMe } from "@/lib/data-access";
import type { BookingResponse, ParticipantDashboard } from "@/lib/data-access";

// Renders the real SectionHeading + MemberCard + Alert (no mocks, except useMe — identity
// now comes from there, not the dashboard aggregate). Note the component surfaces
// topics/universities as COUNTS ("N selected"), not joined lists, and the email only
// drives an "Email verified" pill (not the address).

jest.mock("@/lib/data-access", () => ({
  ...jest.requireActual("@/lib/data-access"),
  useMe: jest.fn(),
}));

const mockUseMe = useMe as jest.Mock;

function booking(overrides: Partial<BookingResponse> = {}): BookingResponse {
  return {
    id: "bk-1",
    status: "CONFIRMED",
    scheduledStartAt: "2026-07-10T15:00:00Z",
    scheduledEndAt: "2026-07-10T16:00:00Z",
    durationMinutes: 60,
    tourOfferingId: "off-1",
    tourTitle: "Hidden gems of North Campus",
    guideName: "Maya Chen",
    guideResponseDeadline: null,
    universityName: "North Campus University",
    price: { amount: 4200, currency: "USD" },
    ...overrides,
  };
}

function makeData(
  overrides: Partial<ParticipantDashboard["participant"]> = {},
  dashboardOverrides: Partial<Omit<ParticipantDashboard, "kind" | "participant">> = {},
): ParticipantDashboard {
  return {
    kind: "participant",
    participant: {
      type: "STUDENT",
      topicsOfInterest: ["cs", "math", "physics"],
      universitiesOfInterest: ["mit", "stanford"],
      ...overrides,
    },
    nextTour: null,
    upcomingBookings: [],
    pendingActions: null,
    createdAt: "2025-03-15T00:00:00Z",
    ...dashboardOverrides,
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
    expect(screen.getByText("Welcome, Grace Hopper.")).toBeInTheDocument();
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
    expect(screen.getByText("Welcome.")).toBeInTheDocument();
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("shows the account 'Member since' month and year", () => {
    // makeData seeds createdAt = 2025-03-15T00:00:00Z.
    render(<ParticipantSummary data={makeData()} />);
    expect(screen.getByText("Member since")).toBeInTheDocument();
    expect(screen.getByText("March 2025")).toBeInTheDocument();
  });

  it("renders an empty booking panel when the participant has no upcoming tours", () => {
    render(<ParticipantSummary data={makeData()} />);
    expect(screen.getByText("Bookings")).toBeInTheDocument();
    expect(screen.getByText("No upcoming tours yet.")).toBeInTheDocument();
  });

  it("renders the next booking from the dashboard aggregate", () => {
    const nextTour = booking();
    render(
      <ParticipantSummary
        data={makeData({}, { nextTour, upcomingBookings: [nextTour], pendingActions: {} })}
      />,
    );

    expect(screen.getByText("Next tour")).toBeInTheDocument();
    expect(screen.getByText("Hidden gems of North Campus")).toBeInTheDocument();
    expect(screen.getByText("North Campus University")).toBeInTheDocument();
    expect(screen.getByText("Maya Chen")).toBeInTheDocument();
    expect(screen.getByText("$42.00")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(document.querySelector('time[datetime="2026-07-10T15:00:00Z"]')).toBeInTheDocument();
    expect(screen.getByText("Time:")).toHaveClass("sr-only");
    expect(screen.getByText("University:")).toHaveClass("sr-only");
    expect(screen.getByText("Guide:")).toHaveClass("sr-only");
  });

  it("lists upcoming bookings without duplicating the next tour row", () => {
    const nextTour = booking();
    const secondTour = booking({
      id: "bk-2",
      status: "WAITING_FOR_GUIDE",
      scheduledStartAt: "2026-07-14T18:00:00Z",
      scheduledEndAt: "2026-07-14T19:30:00Z",
      tourTitle: "Engineering quad tour",
      universityName: "Tech State",
      guideName: "Sam Rivera",
      price: { amount: 6000, currency: "USD" },
    });

    render(
      <ParticipantSummary
        data={makeData(
          {},
          { nextTour, upcomingBookings: [nextTour, secondTour], pendingActions: null },
        )}
      />,
    );

    expect(screen.getByText("2 upcoming")).toBeInTheDocument();
    expect(screen.getAllByText("Hidden gems of North Campus")).toHaveLength(1);
    expect(screen.getByText("Engineering quad tour")).toBeInTheDocument();
    expect(screen.getByText("Waiting For Guide")).toBeInTheDocument();
    expect(screen.getByText("$60.00")).toBeInTheDocument();
  });

  it("lists upcoming bookings even when there is no separate next tour", () => {
    render(
      <ParticipantSummary
        data={makeData(
          {},
          {
            nextTour: null,
            upcomingBookings: [
              booking({
                id: "bk-3",
                tourTitle: "Student life walk",
              }),
            ],
            pendingActions: null,
          },
        )}
      />,
    );

    expect(screen.getByText("1 upcoming")).toBeInTheDocument();
    expect(screen.getByText("Student life walk")).toBeInTheDocument();
    expect(screen.queryByText("No upcoming tours yet.")).not.toBeInTheDocument();
  });

  it("renders every upcoming booking instead of hiding extras", () => {
    const bookings = Array.from({ length: 5 }, (_, index) =>
      booking({
        id: `bk-extra-${index}`,
        tourTitle: `Upcoming tour ${index + 1}`,
      }),
    );

    render(
      <ParticipantSummary
        data={makeData({}, { nextTour: null, upcomingBookings: bookings, pendingActions: null })}
      />,
    );

    expect(screen.getByText("5 upcoming")).toBeInTheDocument();
    expect(screen.getByText("Upcoming tour 1")).toBeInTheDocument();
    expect(screen.getByText("Upcoming tour 5")).toBeInTheDocument();
  });
});
