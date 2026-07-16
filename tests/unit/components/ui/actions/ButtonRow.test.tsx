import { render, screen, within } from "@testing-library/react";
import { ButtonRow } from "@/components/ui/actions/ButtonRow";

describe("ButtonRow", () => {
  it("lays out its buttons in a flex row, right-aligned by default", () => {
    render(
      <ButtonRow data-testid="row">
        <button type="button">Cancel</button>
        <button type="button">Submit</button>
      </ButtonRow>,
    );
    const row = screen.getByTestId("row");
    expect(row).toHaveClass("flex", "justify-end");
    expect(within(row).getAllByRole("button")).toHaveLength(2);
  });

  it("supports other alignments", () => {
    render(
      <ButtonRow align="between" data-testid="row">
        <button type="button">A</button>
        <button type="button">B</button>
      </ButtonRow>,
    );
    expect(screen.getByTestId("row")).toHaveClass("justify-between");
  });
});
