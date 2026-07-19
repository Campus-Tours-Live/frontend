import { render, screen } from "@testing-library/react";

// SiteHeader has its own tests (tests/integration/components/site/SiteHeader.test.tsx);
// stub it here so this test focuses on the page's own content.
jest.mock("@/components/site/SiteHeader", () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));

import UniversityPage from "@/app/university/page";

describe("UniversityPage", () => {
  it("renders the header, breadcrumb, and university name/location", () => {
    render(<UniversityPage />);

    expect(screen.getByTestId("site-header")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "North Coast University" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Arcata, CA")).toBeInTheDocument();
    expect(screen.getByText("Verified campus")).toBeInTheDocument();
  });

  it("renders the quick stats", () => {
    render(<UniversityPage />);

    expect(screen.getByText("4 live tours")).toBeInTheDocument();
    expect(screen.getByText("From verified guides")).toBeInTheDocument();
    expect(screen.getByText("From $38")).toBeInTheDocument();
    expect(screen.getByText("Per live session")).toBeInTheDocument();
  });

  it("renders the mock tour list via TourCarousel, with a View all tours link", () => {
    render(<UniversityPage />);

    expect(
      screen.getByRole("heading", { name: /see north coast university through student eyes/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Marine science labs & the campus quad")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /view all tours/i }).length).toBeGreaterThan(0);
  });
});
