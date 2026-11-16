import { render, screen, within } from "@testing-library/react";
import { UniversityHighlights } from "@/components/home/UniversityHighlights";
import { CAMPUS_FALLBACK_IMAGE } from "@/components/tours/tourCard.visuals";

const mockUseUniversityDetails = jest.fn();
jest.mock("@/lib/data-access", () => ({
  useUniversityDetails: (slugs: readonly string[]) => mockUseUniversityDetails(slugs),
}));

const detail = (over: Record<string, unknown> = {}) => ({
  slug: "berkeley",
  name: "University of California-Berkeley",
  city: "Berkeley",
  region: "CA",
  tourCount: 60,
  imageUrl: "https://pub-3225b84a9a0b4728b11f261ee52251ba.r2.dev/Berkeley.png",
  ...over,
});

beforeEach(() => {
  mockUseUniversityDetails.mockReturnValue([
    { data: detail() },
    { data: detail({ name: "Duke University", city: "Durham", region: "NC", tourCount: 1 }) },
    { data: detail({ name: "University of Michigan", city: "Ann Arbor", region: "MI" }) },
    { data: detail({ name: "Georgia Tech", city: "Atlanta", region: "GA", imageUrl: null }) },
  ]);
});

describe("UniversityHighlights", () => {
  it("asks Core for the four featured universities by slug", () => {
    render(<UniversityHighlights />);

    expect(mockUseUniversityDetails).toHaveBeenCalledWith([
      "berkeley",
      "duke",
      "michigan",
      "gatech",
    ]);
  });

  it("renders a card per loaded university with its name and location", () => {
    render(<UniversityHighlights />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);

    expect(
      screen.getByRole("heading", { name: "University of California-Berkeley" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Berkeley, CA")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Georgia Tech" })).toBeInTheDocument();
    expect(screen.getByText("Atlanta, GA")).toBeInTheDocument();
  });

  it("renders university names as h3, below the section heading", () => {
    render(<UniversityHighlights />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
  });

  it("gives every card an Explore action", () => {
    render(<UniversityHighlights />);
    expect(screen.getAllByRole("button", { name: "Explore" })).toHaveLength(4);
  });

  /**
   * "1 tours" is exactly the sort of thing that survives to production because nobody seeds a
   * single-tour fixture, so the plural is pinned on both sides of the boundary.
   */
  it("pluralises the tour count, singular included", () => {
    render(<UniversityHighlights />);

    expect(screen.getAllByText("60 tours").length).toBeGreaterThan(0);
    expect(screen.getByText("1 tour")).toBeInTheDocument();
    expect(screen.queryByText("1 tours")).not.toBeInTheDocument();
  });

  it("shows each campus photo, using the shared image when a university has none", () => {
    render(<UniversityHighlights />);

    expect(
      screen.getByRole("img", { name: "University of California-Berkeley campus" }),
    ).toHaveAttribute("src", expect.stringContaining("Berkeley.png"));
    expect(screen.getByRole("img", { name: "Georgia Tech campus" })).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent(CAMPUS_FALLBACK_IMAGE)),
    );
  });

  it("leaves out a university that has not loaded or failed, keeping the rest", () => {
    mockUseUniversityDetails.mockReturnValue([
      { data: detail() },
      { data: undefined, isError: true },
      { data: undefined, isLoading: true },
    ]);
    render(<UniversityHighlights />);

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("shows just the name when Core has no location for a school", () => {
    mockUseUniversityDetails.mockReturnValue([
      { data: detail({ name: "No Place College", city: null, region: null }) },
    ]);
    render(<UniversityHighlights />);

    const card = screen.getByRole("heading", { name: "No Place College" }).closest("li")!;
    expect(within(card).queryByText(",")).not.toBeInTheDocument();
  });

  it("renders nothing while nothing has loaded", () => {
    mockUseUniversityDetails.mockReturnValue([{ data: undefined }, { data: undefined }]);
    const { container } = render(<UniversityHighlights />);

    expect(container).toBeEmptyDOMElement();
  });

  it("uses the universities prop instead of Core when given", () => {
    render(
      <UniversityHighlights
        universities={[{ name: "Lone Pine College", location: "Bend, OR", tourCount: 1 }]}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("1 tour")).toBeInTheDocument();
  });

  it("forwards a className onto the grid", () => {
    render(<UniversityHighlights className="mt-4" />);
    expect(screen.getByRole("list")).toHaveClass("mt-4");
  });
});
