import { render, screen, within } from "@testing-library/react";
import { UniversityQuickLinks } from "@/components/home/UniversityQuickLinks";

describe("UniversityQuickLinks", () => {
  it("renders all four entry points with their hints", () => {
    render(<UniversityQuickLinks />);
    const tiles = screen.getAllByRole("listitem");
    expect(tiles).toHaveLength(4);

    expect(screen.getByText("Most applied to")).toBeInTheDocument();
    expect(screen.getByText("Highest application volume")).toBeInTheDocument();
    expect(screen.getByText("Universities near you")).toBeInTheDocument();
    expect(screen.getByText("Universities with tours")).toBeInTheDocument();
    expect(screen.getByText("Browse by state")).toBeInTheDocument();
  });

  /**
   * A tile is an anchor only where the destination exists. The other three are buttons: focusable
   * and keyboard-operable today, without being a link that 404s for a screen reader or a crawler.
   * This pins the split so a later "just add an href" cannot quietly ship one pointing nowhere.
   */
  it("links only the tile whose page exists, and buttons the rest", () => {
    render(<UniversityQuickLinks />);

    expect(screen.getByRole("link", { name: /browse by state/i })).toHaveAttribute(
      "href",
      "/universities/browse-by-state",
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  /** The whole tile is the hit area, so the label must be inside the control, not beside it. */
  it("puts the label and hint inside the control", () => {
    render(<UniversityQuickLinks />);
    const button = screen.getByRole("button", { name: /most applied to/i });
    expect(within(button).getByText("Highest application volume")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /browse by state/i });
    expect(within(link).getByText("Explore by location")).toBeInTheDocument();
  });

  /** A list, so assistive tech announces "4 items" rather than reading four loose divs. */
  it("groups the tiles as a list", () => {
    render(<UniversityQuickLinks />);
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("forwards a className onto the grid", () => {
    render(<UniversityQuickLinks className="mt-4" />);
    expect(screen.getByRole("list")).toHaveClass("mt-4");
  });
});
