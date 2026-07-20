import { render, screen } from "@testing-library/react";
import { Tag } from "@/components/ui/tag/Tag";

describe("Tag", () => {
  it("renders its children with the default blue/secondary styling (theme tokens)", () => {
    render(<Tag>Available</Tag>);
    const el = screen.getByText("Available");
    expect(el).toHaveClass("bg-primary-soft", "text-primary-dark", "rounded-pill");
  });

  it("applies the color × variant class map using theme tokens", () => {
    render(
      <Tag color="green" variant="primary">
        Confirmed
      </Tag>,
    );
    expect(screen.getByText("Confirmed")).toHaveClass("bg-success", "text-success-foreground");
  });

  it("renders leading content before the children", () => {
    render(<Tag leading={<svg data-testid="icon" />}>Rated</Tag>);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("Rated")).toBeInTheDocument();
  });

  it("merges a custom className", () => {
    render(<Tag className="mine">X</Tag>);
    expect(screen.getByText("X")).toHaveClass("mine");
  });
});
