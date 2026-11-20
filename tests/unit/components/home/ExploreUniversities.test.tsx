import { render, screen } from "@testing-library/react";
import { ExploreUniversities } from "@/components/home/ExploreUniversities";

// UniversityHighlights loads its campuses from Core; give it one loaded university.
jest.mock("@/lib/data-access", () => ({
  useUniversityDetails: () => [
    {
      data: {
        slug: "duke",
        name: "Duke University",
        city: "Durham",
        region: "NC",
        tourCount: 60,
        imageUrl: null,
      },
    },
  ],
}));

describe("ExploreUniversities", () => {
  it("renders the eyebrow, headline and lead copy", () => {
    render(<ExploreUniversities />);
    expect(screen.getByText(/explore universities/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /find the right campus for you/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/discover universities, explore tours, and connect with current students/i),
    ).toBeInTheDocument();
  });

  it("renders the CTA as a link to /universities", () => {
    render(<ExploreUniversities />);
    expect(screen.getByRole("link", { name: /browse all universities/i })).toHaveAttribute(
      "href",
      "/universities",
    );
  });

  /**
   * The chevron is decoration beside a label that already reads "Browse all universities". If it
   * ever gained a title it would be appended to the link's accessible name, so this pins the name
   * exactly rather than with a substring match.
   */
  it("keeps the chevron out of the link's accessible name", () => {
    render(<ExploreUniversities />);
    expect(screen.getByRole("link", { name: "Browse all universities" })).toBeInTheDocument();
  });

  /**
   * The banner illustration is decorative (empty alt), so it must not surface as an img to
   * assistive tech; the only images exposed are the university cards' campus photos, each named.
   */
  it("renders the illustration as decorative", () => {
    const { container } = render(<ExploreUniversities />);
    expect(container.querySelector('img[alt=""]')).toBeInTheDocument();
    for (const img of screen.getAllByRole("img")) {
      expect(img).toHaveAccessibleName(/ campus$/);
    }
  });
});
