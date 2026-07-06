import { render, screen } from "@testing-library/react";
import { GuideDashboardShell } from "@/components/dashboard/guide/GuideDashboardShell";
import type { GuideDashboard } from "@/lib/data-access";

function makeData(overrides: Partial<GuideDashboard> = {}): GuideDashboard {
  return {
    kind: "guide",
    guide: {
      firstName: "Maya",
      displayName: "Maya Chen",
      email: "maya@example.com",
      major: "Computer Science",
      applicationStatus: "APPROVED",
    },
    guideStatus: "APPROVED",
    canPublish: true,
    offerings: [],
    createdAt: "2025-03-15T00:00:00Z",
    ...overrides,
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GuideDashboardShell", () => {
  it("renders without crashing", () => {
    render(<GuideDashboardShell data={makeData()} />);
  });

  it("renders the Guide Dashboard eyebrow from DashboardHeader", () => {
    render(<GuideDashboardShell data={makeData()} />);
    expect(screen.getByText("Guide Dashboard")).toBeInTheDocument();
  });

  it("passes the guide firstName to the greeting", () => {
    render(<GuideDashboardShell data={makeData()} />);
    expect(screen.getByRole("heading")).toHaveTextContent("Maya");
  });

  it("falls back to 'there' when guide firstName is missing", () => {
    const data = makeData();
    delete data.guide.firstName;
    render(<GuideDashboardShell data={data} />);
    expect(screen.getByRole("heading")).toHaveTextContent("there");
  });
});
