import { render, screen } from "@testing-library/react";
import { ControlShell } from "@/components/ui/control/ControlShell";

describe("ControlShell", () => {
  it("wraps children in a .control-label label and shows the text label", () => {
    render(
      <ControlShell label="Email me">
        <input aria-label="Email me" type="checkbox" />
        <span data-testid="box" />
      </ControlShell>,
    );
    const label = screen.getByText("Email me").closest("label");
    expect(label).toHaveClass("control-label", "cursor-pointer");
    expect(screen.getByTestId("box")).toBeInTheDocument();
  });

  it("renders no text label span when label is omitted", () => {
    const { container } = render(
      <ControlShell>
        <input aria-label="Bare" type="checkbox" />
      </ControlShell>,
    );
    expect(container.querySelector("span")).not.toBeInTheDocument();
  });

  it("dims and disables the cursor when disabled", () => {
    const { container } = render(
      <ControlShell label="X" disabled>
        <input aria-label="X" type="checkbox" />
      </ControlShell>,
    );
    const label = container.querySelector("label");
    expect(label).toHaveClass("cursor-not-allowed", "opacity-60");
    expect(label).not.toHaveClass("cursor-pointer");
  });

  it("merges a caller className onto the label", () => {
    const { container } = render(
      <ControlShell label="X" className="extra-x">
        <input aria-label="X" type="checkbox" />
      </ControlShell>,
    );
    expect(container.querySelector("label")).toHaveClass("control-label", "extra-x");
  });
});
