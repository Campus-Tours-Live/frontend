import { render, screen } from "@testing-library/react";
import { Collapse } from "@/components/ui/utils/Collapse";

describe("Collapse", () => {
  it("keeps children in the DOM but hidden and 0fr when closed", () => {
    const { container } = render(
      <Collapse id="more" isOpen={false}>
        <p>Details</p>
      </Collapse>,
    );
    expect(screen.getByText("Details")).toBeInTheDocument();
    const outer = container.firstChild as HTMLElement;
    expect(outer).toHaveClass("grid-rows-[0fr]");
    expect(outer).toHaveAttribute("id", "more");
    // The content wrapper is made invisible so it leaves the tab order.
    expect(screen.getByText("Details").parentElement).toHaveClass("invisible");
  });

  it("expands to 1fr and shows the content when open", () => {
    const { container } = render(
      <Collapse isOpen>
        <p>Details</p>
      </Collapse>,
    );
    const outer = container.firstChild as HTMLElement;
    expect(outer).toHaveClass("grid-rows-[1fr]");
    expect(screen.getByText("Details").parentElement).not.toHaveClass("invisible");
  });
});
