import { render, screen } from "@testing-library/react";
import { Tag } from "@/components/ui/Tag";

describe("Tag", () => {
  it("renders its children with the default blue/secondary styling", () => {
    render(<Tag>Available</Tag>);
    const el = screen.getByText("Available");
    expect(el).toHaveClass("bg-blue-100", "text-blue-800", "rounded-pill");
  });

  it("applies the color × variant class map", () => {
    render(
      <Tag color="green" variant="primary">
        Confirmed
      </Tag>,
    );
    expect(screen.getByText("Confirmed")).toHaveClass("bg-emerald-600", "text-white");
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
