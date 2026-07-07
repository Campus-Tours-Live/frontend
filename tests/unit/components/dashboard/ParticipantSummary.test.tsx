import { render, screen } from "@testing-library/react";
import { ParticipantSummary } from "@/components/dashboard/ParticipantSummary";
import type { ParticipantDashboard } from "@/lib/data-access";

// Renders the real SectionHeading + MemberCard + Alert (no mocks). Note the
// component surfaces topics/universities as COUNTS ("N selected"), not joined
// lists, and the email only drives an "Email verified" pill (not the address).

function makeData(
  overrides: Partial<ParticipantDashboard["participant"]> = {},
): ParticipantDashboard {
  return {
    kind: "participant",
    participant: {
      displayName: "Grace Hopper",
      email: "grace@example.com",
      participantType: "STUDENT",
      topicsOfInterest: ["cs", "math", "physics"],
      universitiesOfInterest: ["mit", "stanford"],
      ...overrides,
    },
    createdAt: "2025-03-15T00:00:00Z",
  };
}

describe("ParticipantSummary", () => {
  it("renders the greeting header (eyebrow + first name) and the display name in the card", () => {
    render(<ParticipantSummary data={makeData({ firstName: "Grace" })} />);
    expect(screen.getByText("Participant Dashboard")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Grace");
  });

  it("greets by displayName when firstName is missing", () => {
    render(<ParticipantSummary data={makeData()} />); // default has displayName, no firstName
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Grace Hopper");
    // displayName is the MemberCard name.
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("renders the participant type", () => {
    render(<ParticipantSummary data={makeData({ participantType: "PARENT" })} />);
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
    delete data.participant.participantType;
    render(<ParticipantSummary data={data} />);
    // Type, Topics, Universities all fall back.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("shows the 'Email Verified' pill when email is present", () => {
    render(<ParticipantSummary data={makeData()} />);
    expect(screen.getByText("Email Verified")).toBeInTheDocument();
  });

  it("omits the 'Email verified' pill when email is missing", () => {
    const data = makeData();
    delete data.participant.email;
    render(<ParticipantSummary data={data} />);
    expect(screen.queryByText("Email Verified")).not.toBeInTheDocument();
  });

  it("renders the Guardian highlight for a PARENT participant", () => {
    render(<ParticipantSummary data={makeData({ participantType: "PARENT" })} />);
    expect(screen.getByText("Guardian consent active")).toBeInTheDocument();
    expect(screen.queryByText("Ready to explore")).not.toBeInTheDocument();
  });

  it("renders the explorer highlight for a non-PARENT participant", () => {
    render(<ParticipantSummary data={makeData({ participantType: "STUDENT" })} />);
    expect(screen.getByText("Ready to explore")).toBeInTheDocument();
    expect(screen.queryByText("Guardian consent active")).not.toBeInTheDocument();
  });

  it("greets 'there' and shows 'Member' when name fields are missing", () => {
    const data = makeData();
    delete data.participant.displayName;
    render(<ParticipantSummary data={data} />);
    // No firstName/displayName -> greeting falls back to "there", card name to "Member".
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("there");
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("shows the account 'Member since' month and year", () => {
    // makeData seeds createdAt = 2025-03-15T00:00:00Z.
    render(<ParticipantSummary data={makeData()} />);
    expect(screen.getByText("Member since")).toBeInTheDocument();
    expect(screen.getByText("March 2025")).toBeInTheDocument();
  });
});
