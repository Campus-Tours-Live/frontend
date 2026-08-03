import { render, screen, within } from "@testing-library/react";
import { UniversityHighlights } from "@/components/home/UniversityHighlights";

describe("UniversityHighlights", () => {
  it("renders a card per university with its name and location", () => {
    render(<UniversityHighlights />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);

    expect(screen.getByRole("heading", { name: "North Coast University" })).toBeInTheDocument();
    expect(screen.getByText("Coastal City, CA")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Blue Ridge Institute" })).toBeInTheDocument();
    expect(screen.getByText("Morrison, CO")).toBeInTheDocument();
  });

  /**
   * The banner's title is the section's h2, so these sit at h3 — skipping a level is the most
   * common way a card grid breaks heading navigation.
   */
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
    expect(screen.getByText("32 tours")).toBeInTheDocument();

    // The default sample has no single-tour campus, which is exactly why "1 tours" survives to
    // production elsewhere. Feed one in rather than trusting the ternary by eye.
    render(
      <UniversityHighlights
        universities={[{ name: "Lone Pine College", location: "Bend, OR", tourCount: 1 }]}
      />,
    );
    expect(screen.getByText("1 tour")).toBeInTheDocument();
    expect(screen.queryByText("1 tours")).not.toBeInTheDocument();
  });

  /**
   * A list item carries no accessible name of its own, so the card is reached through its heading
   * rather than by role+name — which is also how a reader actually finds it.
   */
  it("keeps each card's action and count inside that card", () => {
    render(<UniversityHighlights />);
    const card = screen
      .getByRole("heading", { name: "Harborview University" })
      .closest("li") as HTMLElement;

    expect(within(card).getByRole("button", { name: "Explore" })).toBeInTheDocument();
    expect(within(card).getByText("5 tours")).toBeInTheDocument();
    expect(within(card).getByText("Seattle, WA")).toBeInTheDocument();
    // and not a neighbour's
    expect(within(card).queryByText("32 tours")).not.toBeInTheDocument();
  });

  it("forwards a className onto the grid", () => {
    render(<UniversityHighlights className="mt-4" />);
    expect(screen.getByRole("list")).toHaveClass("mt-4");
  });
});
